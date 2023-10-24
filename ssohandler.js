const  crypto = require('crypto'); 
const  xor =  require('bitwise-xor');

module.exports = class EpicSsoHandler {

    //encryption algorithm used by open.epic
    algorithm = 'aes-128-cbc';
    // hash algorithm used by the Microsoft key derivation algorithm. 
    // Note, no where is this actually specified. I tried several different algorithms before deciding on this one
    hash_algorithm = 'sha1';
    //aes-128 requires a key of length 16
    key_length = 16;

    /*
    * secret can be anything you want (utf-8 encoded). It must match the secret you provided to open.epic to use to encrypt the data
    */
    constructor(secret) {
        this.secret = secret;
    }

    /*
    * data - encrypted query parameters sent by open.epic. It is base64 encoded
    * @returns decrypted query parameters
    */
    decrypt(data) {
        console.log('running decrypt');
        let key = this.deriveKey(this.secret);
        let decipher = crypto.createDecipheriv(this.algorithm, key, this.iv);
        //configures PKCS7/PKCS5 padding
        decipher.setAutoPadding(true);
        return decipher.update(data, 'base64', 'utf8') + decipher.final('utf8');
    }

    //I implemented this for my own testing purposes
    encrypt(data) {
        let key = this.deriveKey(this.secret);
        let cipher = crypto.createCipheriv(this.algorithm, key, this.iv);
        cipher.setAutoPadding(true);
        return cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
    }

    /*
    * This is the implementation of the Microsoft Key deriviation algorithm, found here:
    * https://msdn.microsoft.com/en-us/library/windows/desktop/aa379916(v=vs.85).aspx#Remarks
    */
    deriveKey(secret) {
        let secret_hash = this.hash(secret, 'utf8');
        let step1_mask = Buffer.alloc(secret_hash.length, 0x36);

        let step1_buf = Buffer.concat([
            xor(step1_mask, secret_hash),
            Buffer.alloc(64-secret_hash.length, 0x36)
        ]);
        let step1_result = this.hash(step1_buf.toString('base64'), 'base64');

        let step2_mask = Buffer.alloc(secret_hash.length, 0x5C);
        let step2_buf = Buffer.concat([
            xor(step2_mask, secret_hash),
            Buffer.alloc(64-secret_hash.length, 0x5C)
        ]);
        let step2_result = this.hash(step2_buf.toString('base64'), 'base64');

        let step3_result = Buffer.concat([step1_result, step2_result]);

        let result = step3_result.slice(0, this.key_length);
        return result;
    }

    hash(input, encoding='utf8') {
        let hash = crypto.createHash(this.hash_algorithm);
        hash.update(input, encoding);
        return hash.digest();
    }

    get iv() {
        return Buffer.alloc(this.key_length);
    }
}
