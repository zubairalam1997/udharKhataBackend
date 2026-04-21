import prisma from "../db/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import { Decimal } from "@prisma/client/runtime/client";

class TransactionService{

    // create transaction request
   // transaction.service.js
async createRequest(senderId, data) {
    const { receiverPhone, amount, type, note } = data;

    // Find the receiver in the database using the phone number
    const receiver = await prisma.user.findUnique({
        where: { phoneNumber: receiverPhone }
    });

    if (!receiver) {
        throw new ApiError(404, "Recipient not found with this phone number");
    }

    // Create the request
    return await prisma.transactionRequest.create({
        data: {
            senderId,
            receiverId: receiver.id, // This is where the ID finally gets used
            amount,
            type,
            note,
            status: 'PENDING'
        }
    });
}

    // Handle transaction request(approve/reject)
    async handleRequest(userId, requestId, action, rejectionReason){

        //find the request
        const request = await prisma.transactionRequest.findUnique({
            where: {id: requestId},
            include: {
                sender:{
                    select:{
                        id: true,
                        phoneNumber: true,
                        displayName: true,
                        businessName: true
                    }
                }
            }
        });

        if(!request){
            throw new ApiError(404, "Transaction request not found");
        }
        
        // get current user
        const currentUser = await prisma.user.findUnique({
            where: {id: userId},
            select: {phoneNumber: true}
        });

        // verify if user is receiver
        const isAuthorized = request.receiverId === userId || (request.receiverId === null && request.receiverPhone === currentUser.phoneNumber)
        if(!isAuthorized){
            throw new ApiError(403, "You are not authorized to handle this request");
        }

        // if receiverId was null
        if(request.receiverId === null){
            await prisma.transactionRequest.update({
                where: {id: requestId},
                data: {receiverId: userId}
            });
            request.receiverId = userId;
        }

        // if request is already handled
        if(request.status !== 'PENDING'){
            throw new ApiError(400, `Request already ${request.status.toLowerCase()}`);
        }

        // check if request expired
        if(new Date() > request.expiresAt){
            await prisma.transactionRequest.update({
                where: {id: requestId},
                data: {status: 'EXPIRED'}
            });
            throw new ApiError(400, "Request has expired");
        }

        if(action === 'REJECTED'){
            const updatedRequest = await prisma.transactionRequest.update({
                where: {id: requestId},
                data: {
                    status: 'REJECTED',
                    note: rejectionReason
                }            
            });
            // TODO: Send rejection notification to sender

            return {
                request: updatedRequest,
                ledgerEntries: null
            };
        }

        // Approve request & add to ledger entries for both users
        return await this._createLedgerEntries(request, userId);
    }

    // create two ledger entries for both user
    async _createLedgerEntries(request, approverId){

        return await prisma.$transaction(async(tx) => {
            // update request status
            await tx.transactionRequest.update({
                where: {id: request.id},
                data: {status: 'APPROVED'}
            });
            const amount = new Decimal(request.amount);
            const isCredit = request.type === 'CREDIT';

            // get sender's contact
            const senderContact = await tx.contact.findUnique({
                where: {
                    userId_phoneNumber: {
                        userId: request.senderId,
                        phoneNumber: request.receiverPhone
                    }
                }
            });

            // check if receiver is a registered user
            const receiver = await tx.user.findUnique({
                where: {id: approverId},
                select: {phoneNumber: true }
            });

            // get receiver's contact
            const receiverContact = await tx.contact.findFirst({
                where:{
                    userId: approverId,
                    phoneNumber: request.sender.phoneNumber 
                }
            });

            // receiver doesn't have sender as contact
            let receiverContactFinal = receiverContact;
            if(!receiverContact){
                receiverContactFinal = await tx.contact.create({
                    data:{
                        userId: approverId,
                        phoneNumber: request.sender.phoneNumber,
                        name: request.sender.displayName || request.sender.businessName,
                        currentBalance: new Decimal(0)

                    }
                });
            }

            // calculate new balances
            const senderNewBalance = isCredit ? senderContact.currentBalance.add(amount) : senderContact.currentBalance.sub(amount);

            const receiverNewBalance = isCredit ? receiverContactFinal.currentBalance.sub(amount) : receiverContactFinal.currentBalance.add(amount);

            // create sender ledger
            const senderLedger = await tx.ledger.create({
                data:{
                    userId: request.senderId,
                    contactId: senderContact.id,
                    requestId: request.id,
                    amount,
                    type: request.type,
                    note: request.note,
                    balanceAfter: senderNewBalance,
                    approvedBy: approverId,
                    approvedAt: new Date()

                }
            });

            // create ledger for receiver
            const receiverLedger = await tx.ledger.create({
                data:{
                    userId: approverId,
                    contactId: receiverContactFinal.id,
                    requestId: request.id,
                    amount,
                    type: request.type === 'CREDIT' ? 'PAYMENT' : 'CREDIT',
                    note: request.note,
                    balanceAfter: receiverNewBalance,
                    approvedBy: approverId,
                    approvedAt: new Date()
                }
            });

            // update sender contact balance
            await tx.contact.update({
                where: {
                    id: senderContact.id
                },
                data: {currentBalance: senderNewBalance}
            });

            // update receiver contact balance
            await tx.contact.update({
                where: {id: receiverContactFinal.id},
                data: {currentBalance: receiverNewBalance}
            });

            return{
                request: await tx.transactionRequest.findUnique({
                    where: {id: request.id}
                }),
                ledgerEntries: [senderLedger, receiverLedger]
            }


        });

    }

    // get pending requests (sent/recieved)
    async getPendingRequests(userId, type = 'all', page = 1, limit=20){
        const skip = (page-1)*limit;

        const filters = {
            status: 'PENDING',
            expiresAt: {gt: new Date()}
        };

        if(type === 'sent'){
            filters.senderId = userId;
        }else if(type === 'received'){
            filters.receiverId = userId;
        }else{
            filters.OR = [
                {senderId: userId},
                {receiverId: userId}
            ];
        }

        const [requests, total] = await Promise.all([
            prisma.transactionRequest.findMany({
                where: filters,
                include:{
                    sender:{
                        select:{
                            phoneNumber
                            : true,
                            displayName: true,
                            businessName: true,
                            userType: true
                        }
                    },
                    receiver:{
                        select:{
                            phoneNumber: true,
                            displayName: true,
                            businessName: true,
                            userType: true
                        }
                    }
                },
                orderBy: {createdAt: 'desc'},
                skip,
                take: limit
            }),
            prisma.transactionRequest.count({
                where: filters
            })
        ]);

        return {
            requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total/limit)
            }
        };
    }

    // send reminder for pending requests
    async sendReminder(userId, requestId){
        const request = await prisma.transactionRequest.findUnique({
            where: {id: requestId}
        });

        if(!request){
            throw new ApiError(404, 'Transaction request not found');
        }

        if(request.senderId !== userId){
            throw new ApiError(403, "You can only send reminders for your own requests");
        }

        if(request.status !== 'PENDING'){
            throw new ApiError(400, "You can only send reminders for pending requests");
        }

        // check last reminder
        if(request.lastReminderSent){
            const hoursSinceLastReminder = (Date.now() - request.lastReminderSent.getTime())/ (1000*60*60);
            if(hoursSinceLastReminder < 24){
                throw new ApiError(400, `You can send next reminder after ${Math.ceil(24 - hoursSinceLastReminder)} hours`);
            }
        }
        //  TODO: SMS/Push notification

        // update reminder tracking
        await prisma.transactionRequest.update({
            where: {id: requestId},
            data:{
                lastReminderSent: new Date(),
                reminderCount: {increment: 1}
            }
        });

        return {
            message: 'Reminder sent successfully'
        };

    }


}

export default new TransactionService();