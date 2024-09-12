const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2)

module.exports.encrypt = async (hashedPassword) => {
    const salt = crypto.randomBytes(16);
    const iterations = 1000;
    const keyLength = 32;

    const key = await pbkdf2(hashedPassword, salt, iterations, keyLength, 'sha256');
    const iv = crypto.randomBytes(16);


    return {
        cipher: crypto.createCipheriv('aes-256-ctr', key, iv),
        iv: iv.toString('hex'),
        salt: salt.toString('hex')
    };
}

module.exports.decrypt = async (salt, iv, hashedPassword) => {
    const iterations = 1000;
    const keyLength = 32;

    const key = await pbkdf2(hashedPassword, salt, iterations, keyLength, 'sha256');
    return crypto.createDecipheriv('aes-256-ctr', key, iv);
}