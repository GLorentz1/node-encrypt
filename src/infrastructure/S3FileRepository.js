
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {Upload} = require("@aws-sdk/lib-storage");

class S3FileRepository {
    constructor(s3Client, bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
    }

    async generateUploadUrl({ key }) {
        const command = new PutObjectCommand({Bucket: this.bucketName, Key: key});
        return getSignedUrl(this.s3Client, command, {expiresIn: 3600});
    }

    async generateDownloadUrl({ key }) {
        const command = new GetObjectCommand({Bucket: this.bucketName, Key: key});
        return getSignedUrl(this.s3Client, command, {expiresIn: 3600});
    }

    async get ({ key }) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key,
            };

            return await this.s3Client.send(new GetObjectCommand(params));
        } catch (error) {
            console.error('Error sending S3 get command:', error);
            throw new Error('Failed to retrieve object from S3');
        }
    };

    async add ({ key, body }) {
        try {
            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: this.bucketName,
                    Key: key,
                    Body: body,
                }
            });

            await upload.done();
            console.log(`File uploaded successfully: ${key}`);
        } catch (err) {
            console.error('Error uploading to S3:', err);
            throw new Error('Could not upload file to S3');
        }
    };

    async delete({ key }){
        const command = new DeleteObjectCommand({Bucket: this.bucketName, Key: key});
        await this.s3Client.send(command)
        console.log(`File deleted successfully: ${key}`);
    }

}

module.exports = S3FileRepository;
