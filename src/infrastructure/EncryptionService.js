const crypto = require('crypto');
const { promisify } = require('util');
const bcrypt = require('bcryptjs');

const pbkdf2 = promisify(crypto.pbkdf2)

class EncryptionService {
    constructor() {
    }

    async encrypt(password) {
        const salt = crypto.randomBytes(16);
        const iterations = 1000;
        const keyLength = 32;

        const key = await pbkdf2(password, salt, iterations, keyLength, 'sha256');
        const iv = crypto.randomBytes(16);


        return {
            cipher: crypto.createCipheriv('aes-256-ctr', key, iv),
            iv: iv.toString('hex'),
            salt: salt.toString('hex')
        };
    }

    async decrypt(password, salt, iv) {
        const iterations = 1000;
        const keyLength = 32;

        const key = await pbkdf2(password, salt, iterations, keyLength, 'sha256');
        return crypto.createDecipheriv('aes-256-ctr', key, iv);
    }

    async hash(password) {
        return bcrypt.hash(password, 10);
    }

    async compare(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
}

module.exports = EncryptionService