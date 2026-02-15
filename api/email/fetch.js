import Imap from 'imap';
import { simpleParser } from 'mailparser';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        EMAIL_USER,
        EMAIL_PASSWORD,
        EMAIL_HOST = 'imap.secureserver.net', // Default Godaddy
        EMAIL_PORT = 993
    } = process.env;

    if (!EMAIL_USER || !EMAIL_PASSWORD) {
        return res.status(400).json({ error: 'Missing email credentials in server environment.' });
    }

    const imap = new Imap({
        user: EMAIL_USER,
        password: EMAIL_PASSWORD,
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        tls: true,
        tlsOptions: { rejectUnauthorized: false } // Helpful for some shared hosting certs
    });

    try {
        const emails = await new Promise((resolve, reject) => {
            const fetchedEmails = [];

            imap.once('ready', () => {
                imap.openBox('INBOX', true, (err, box) => {
                    if (err) return reject(err);

                    // Fetch last 20 emails
                    const f = imap.seq.fetch(`${Math.max(1, box.messages.total - 19)}:*`, {
                        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
                        struct: true
                    });

                    f.on('message', (msg, seqno) => {
                        let emailData = { seqno };
                        let buffer = '';

                        msg.on('body', (stream, info) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        msg.once('attributes', (attrs) => {
                            emailData.date = attrs.date;
                            emailData.flags = attrs.flags;
                            emailData.uid = attrs.uid;
                        });

                        msg.once('end', () => {
                            // Simple parsing for now - in production we might want full parsing
                            // reusing mailparser for headers is safer
                            simpleParser(buffer).then(parsed => {
                                fetchedEmails.unshift({
                                    id: emailData.uid,
                                    seqno: emailData.seqno,
                                    from: parsed.from?.text,
                                    subject: parsed.subject,
                                    date: emailData.date,
                                    text: parsed.text ? parsed.text.substring(0, 200) + '...' : '(No preview)', // Preview
                                    html: parsed.html // Full content if needed later
                                });
                            }).catch(e => console.error("Parse error", e));
                        });
                    });

                    f.once('error', (err) => {
                        reject(err);
                    });

                    f.once('end', () => {
                        imap.end();
                        // Give a small buffer for parsing to finish since it's async inside the event
                        setTimeout(() => resolve(fetchedEmails), 1000);
                    });
                });
            });

            imap.once('error', (err) => {
                reject(err);
            });

            imap.connect();
        });

        res.status(200).json({ emails });
    } catch (error) {
        console.error("IMAP Error:", error);
        res.status(500).json({ error: 'Failed to fetch emails', details: error.message });
    }
}
