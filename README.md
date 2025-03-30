# Encrypted File Storage Service

This repository contains a NodeJS + serverless framework application that allows safe and private file storage.
The API allows users to upload their files, which are then kept encrypted in S3. Files are decrypted only when a user requests a download and provides the correct password.

## **Architecture Overview**

1. **Upload Lambda (`upload`)**
    - Receives `filename` and `password`.
    - Generates a UUID and a presigned URL for file upload.

2. **Download Lambda (`download`)**
    - On the first request, it initiates the decryption process (if the provided password matches).
    - If the file is already decrypted, it returns a presigned URL for downloading the decrypted file (if the provided password matches).

3. **Status Lambda (`status`)**
    - Checks the processing status of a file.

4. **S3 Event Triggers**
    - **Initial upload trigger:** Encrypts the uploaded file and deletes the original file.
    - **Decryption requested trigger:** Decrypts the file, updates its status and deletes the encrypted file.

## Requirements

- [Node.js](https://nodejs.org/en) (tested with version 20)
- [AWS CLI](https://docs.aws.amazon.com/cli/index.html)
- AWS credentials

## **Deployment**
#### The repository includes a Github Action deploy workflow that:
1. Installs dependencies: `npm install`
2. Runs tests: `npm test`
3. Configures AWS credentials (using Github Secrets)
4. Deploys the infrastructure to an environment, based on the current branch being deployed:
   5. branch `dev` - validation environment
   6. branch `prod` - production environment

Development is done on the `dev` branch. After careful validation, new features can be deployed to the production environment through PRs (merge `dev` into `prod`) 

## **How to Use**

### **1. Upload a File**
Make a `POST` request to the `upload` endpoint with the following JSON payload:
```json
{
  "filename": "example.txt",
  "password": "your-secure-password"
}
```
Response:
```json
{
  "uuid": "generated-uuid",
  "presigned_url": "https://s3-presigned-url"
}
```
Use the `presigned_url` to upload the file using a `PUT` request.

### **2. Check File Status**
Make a `GET` request to the `status` endpoint with the file UUID:
```http
GET /status?uuid=generated-uuid
```
Response example:
```json
{
  "status": "encrypted"
}
```

### **3. Download a File**
Make a `POST` request to the `download` endpoint with the following JSON payload:
```json
{
  "uuid": "your-generated-uuid",
  "password": "your-secure-password"
}
```
- If the password matches and the file is encrypted, the decryption process starts.
- If the password matches and the file is decrypted, a presigned URL is returned for downloading the file.
- If the password doesn't match, an error is returned.

