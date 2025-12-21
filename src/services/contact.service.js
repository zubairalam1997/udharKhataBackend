import prisma from "../db/db.config.js";
import { ApiError } from "../utils/ApiError.js";
import PDFDocument from "pdfkit";


class ContactService{

    // get all contacts
    async getContacts(userId, search = '', page = 1, limit = 20){
        const skip = (page - 1)*limit;
        const filters = {
            userId,
            ...(search && {
                OR: [
                    {name: {contains: search, mode: 'insensitive'}},
                    {phoneNumber: {contains: search}}
                ]
            })
        };
        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where: filters,
                select:{
                    id: true,
                    name: true,
                    phoneNumber: true,
                    currentBalance: true,
                    linkedUserId: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: [
                    {currentBalance: 'desc'},
                    {updatedAt: 'desc'}
                ],
                skip,
                take: limit
            }),
            prisma.contact.count({where: filters})
        ]);

        //calculate summary of searched contacts
        const summary = await prisma.contact.aggregate({
            where:{userId, id: contacts.id},
            _sum:{
                currentBalance: true
            }
        });

        return {
            contacts,
            summary:{
                netBalance: summary._sum.currentBalance || 0,
                totalContacts: total
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total/limit)
            }
        };
    }

    // get single contact details
    async getContactDetails(userId, contactId, page = 1, limit = 20){
        const skip = (page - 1)*limit;
        const contact = await prisma.contact.findFirst({
            where: {
                id: contactId,
                userId
            },
            include: {
                ledgerEntries:{
                    orderBy: {transactionDate: 'desc'},
                    skip,
                    take: limit,
                    select:{
                        id: true,
                        amount: true,
                        type: true,
                        note: true,
                        balanceAfter: true,
                        transactionDate: true
                    }
                }
            }
        });

        if(!contact){
            throw new ApiError(404, 'Contact not found');
        }

        return contact;
    }

    // get ledger history with start and end dates
    async getLedger(userId, contactId, startDate, endDate, page = 1, limit = 50){
        const skip = (page-1)*limit;

        const contact = await prisma.contact.findFirst({
            where:{
                id: contactId,
                userId
            },
            select: {
                userId: true,
                name: true,
                phoneNumber: true,
                currentBalance: true
            }
        });

        if(!contact){
            throw new ApiError(404, 'Contact not found');
        }

        const filters = {
            contactId,
            userId,
            ...(startDate || endDate) && {
                transactionDate:{
                    ...(startDate && {gte: new Date(startDate)}),
                    ...(endDate && {lte: new Date(endDate)})
                }
            }
        };

        const [transactions, total] = await Promise.all([
            prisma.ledger.findMany({
                where: filters,
                select:{
                    id: true,
                    amount: true,
                    type: true,
                    note: true,
                    balanceAfter: true,
                    transactionDate: true,
                    approvedAt: true,
                    request:{
                        select:{
                            id: true,
                            sender:{
                                select:{
                                    displayName: true,
                                    businessName: true
                                }
                            }
                        }
                    }
                },
                orderBy: {transactionDate: 'desc'},
                skip,
                take: limit
            }),
            prisma.ledger.count({
                where: filters
            })
        ]);

        const summary = await prisma.ledger.groupBy({
            by: ['type'],
            where: filters,
            _sum:{
                amount: true
            }
        });

        const totalAmountRecieved = summary.find(s => s.type === 'CREDIT')?._sum.amount || 0;
        const totalAmountPaid = summary.find(s => s.type === 'PAYMENT')._sum.amount || 0;

        return{
            contact:{
                id: contactId,
                name: contact.name,
                phoneNumber: contact.phoneNumber,
                currentBalance: contact.currentBalance,
            },
            transactions,
            summary:{
                totalAmountRecieved,
                totalAmountPaid,
                netBalance: contact.currentBalance
            },
            pagination:{
                page,
                limit,
                total,
                totalPages: Math.ceil(total/limit)
            }
        }
    }

    // generate pdf statement
    async generatePDFStatement(userId, contactId, startDate, endDate){

        const user = await prisma.user.findUnique({
            where: {id: userId},
            select:{
                displayName: true,
                businessName: true,
                phoneNumber: true,
                userType: true
            }
        });

        if(!user){
            throw new ApiError(404, "User not found");
        }

        const ledgerData = await this.getLedger(userId, contactId, startDate, endDate, parseInt(1),
        parseInt(1000));

        return this._generatePDF(user, ledgerData, startDate, endDate);
        

    }

    // method to generate pdf statement
    async _generatePDF(user, ledgerData, startDate, endDate){

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    info:{
                        Title: `Statement - ${ledgerData.contact.name}`,
                        Author: user.displayName || user.businessName || 'Udhar Khata',
                        Subject: 'Transaction Statement'
                    }
                });

                const chunks = [];

                // collect pdf data
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', ()=> resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // header
                doc.fontSize(20).font('Helvetica-Bold')
                .text('TRANSACTION STATEMENT', { align: 'center' });

                doc.moveDown();
                doc.fontSize(10).font('Helvetica');

                //user details
                const userName = user.displayName || user.businessName || 'User';
                doc.text(`From: ${userName}`, 50);
                doc.text(`Phone: ${user.phoneNumber}`, 50);

                doc.moveDown();

                //contact details
                doc.text(`To: ${ledgerData.contact.name}`, 50);
                doc.text(`Phone: ${ledgerData.contact.phoneNumber}`, 50);

                doc.moveDown();

                // data range
                if(startDate || endDate){
                    const start = startDate ? new Date(startDate).toLocaleDateString('en-In') : 'Beginning';
                    const end = endDate? new Date(endDate).toLocaleDateString('en-In') : 'Today';
                    doc.text(`Period: ${start} to ${end}`, 50);
                }
                doc.moveDown();
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown();

                 //summary box
                doc.fontSize(12).font('Helvetica-Bold');
                doc.text('SUMMARY', 50);
                doc.fontSize(10).font('Helvetica');
                doc.moveDown(0.5);

                const summary = ledgerData.summary;
                doc.text(`Total Lent: Rs. ${Number(summary.totalAmountPaid).toFixed(2)}`, 50);
                doc.text(`Total Recieved: Rs. ${Number(summary.totalAmountRecieved).toFixed(2)}`, 50);
                const netBalance = Number(summary.netBalance);
                const balanceText = netBalance >=0 ? `You will recieve: Rs. ${netBalance.toFixed(2)}`: `You will pay: Rs. ${Math.abs(netBalance).toFixed(2)}`;

                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor(netBalance >= 0 ? 'green' : 'red')
                   .text(balanceText, 50);
                
                doc.fillColor('black');
                doc.moveDown();
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown();
                
                // Transaction Table Header
                doc.fontSize(10).font('Helvetica-Bold');
                const tableTop = doc.y;
                const col1 = 50;
                const col2 = 130;
                const col3 = 250;
                const col4 = 350;
                const col5 = 450;

                doc.text('Date', col1, tableTop);
                doc.text('Type', col2, tableTop);
                doc.text('Amount', col3, tableTop);
                doc.text('Balance', col4, tableTop);
                doc.text('Note', col5, tableTop);

                doc.moveDown();
                doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                doc.moveDown(0.5);

                // Transaction Rows
                doc.fontSize(9).font('Helvetica');
                
                ledgerData.transactions.forEach((txn, index) => {
                    const rowY = doc.y;

                    // Check if we need a new page
                    if(rowY > 700){
                        doc.addPage();
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.text('Date', col1, 50);
                        doc.text('Type', col2, 50);
                        doc.text('Amount', col3, 50);
                        doc.text('Balance', col4, 50);
                        doc.text('Note', col5, 50);
                        doc.moveDown();
                        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
                        doc.moveDown(0.5);
                        doc.fontSize(9).font('Helvetica');
                    }

                    const date = new Date(txn.transactionDate).toLocaleDateString('en-IN');
                    const type = txn.type;
                    const amount = `Rs. ${Number(txn.amount).toFixed(2)}`;
                    const balance = `Rs. ${Number(txn.balanceAfter).toFixed(2)}`;
                    const note = txn.note || '-';

                    // Color code the type
                    doc.fillColor('black').text(date, col1, rowY);
                    
                    doc.fillColor(type === 'CREDIT' ? 'green' : 'red')
                       .text(type, col2, rowY);
                    
                    doc.fillColor('black')
                       .text(amount, col3, rowY);
                    
                    doc.text(balance, col4, rowY);
                    doc.text(note.substring(0, 15), col5, rowY);

                    doc.moveDown(1.2);


                    // light separator line
                    if(index < ledgerData.transactions.length - 1){
                        doc.strokeColor('#cccccc')
                           .moveTo(50, doc.y)
                           .lineTo(545, doc.y)
                           .stroke();
                        doc.strokeColor('black');
                        doc.moveDown(0.3);
                    }
                });

                // Footer
                doc.fontSize(8)
                   .fillColor('gray')
                   .text(
                       `Generated on ${new Date().toLocaleString('en-IN')} | Udhar Khata`,
                       50,
                       750,
                       { align: 'center' }
                   );

                // finalize PDF
                doc.end();
                
            } catch (error) {
                reject(error);
            }
        })
    }

    //sync phone contacts
    async syncContacts(userId, phoneNumbers){

        const user = await prisma.user.findUnique({
            where: {id: userId}
        });
        if(!user){
            throw new ApiError(403, "You are not a registered user");
        }

        if(!Array.isArray(phoneNumbers) || phoneNumbers.length == 0){
            throw new ApiError(400, "Phone numbers array required");
        }

        // limit to 100 contacts per sync
        if(phoneNumbers.length > 1000){
            throw new ApiError(400, 'Cannot sync more than 1000 contacts at a time')
        }

        // find phone numbers of registered users
        const registeredUsers = await prisma.user.findMany({
            where:{
                phoneNumber: {in: phoneNumbers}
            },
            select:{
                id: true,
                phoneNumber: true,
                displayName: true,
                businessName: true,
                userType: true
            }
        });

        return{
            total: phoneNumbers.length,
            registered: registeredUsers.length,
            users: registeredUsers
        }
    }
}

export default new ContactService();