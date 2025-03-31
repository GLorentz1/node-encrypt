# Encrypted File Storage Service

This repository contains a NodeJS + serverless framework application that allows safe and private file storage.
The API allows users to upload their files, which are then kept encrypted in S3. Files are decrypted only when a user requests a download and provides the correct password.

## **Architecture Overview**

A diagram of the infrastructure:
![diagram-export-3-31-2025-8_23_56-PM](https://github.com/user-attachments/assets/34355473-b39f-4a97-9616-e4bd6590cdfa)


1. **Upload Lambda (`upload`)**
    - Receives `filename` and `password`.
    - Generates a UUID and a presigned URL for file upload.

2. **Download Lambda (`download`)**
    - On the first request, it initiates the decryption process (if the provided password matches).
    - If the file is already decrypted, it returns a presigned URL for downloading the decrypted file (if the provided password matches).
  
3. **Update Lambda (`update`)**
    - Receives `filename`, `password` and `uuid`.
    - Generates a new presigned URL for file upload if passwords match.

4. **Delete Lambda (`delete`)**
    - Receives `password` and `uuid`.
    - Deletes file if passwords match and file is in encrypted/decrypted state.

5. **Status Lambda (`status`)**
    - Checks the processing status of a file.

6. **S3 Event Triggers**
    - **Initial upload trigger:** Encrypts the uploaded file and deletes the original file.
    - **Decryption requested trigger:** Decrypts the file, updates its status and deletes the encrypted file.

## Requirements

- [Node.js](https://nodejs.org/en) (tested with version 22)
- [AWS CLI](https://docs.aws.amazon.com/cli/index.html)
- AWS credentials

## **Deployment**
#### The repository includes a Github Action deploy workflow that:
1. Installs dependencies: `npm install`
2. Runs tests: `npm test`
3. Configures AWS credentials (using Github Secrets)
4. Deploys the infrastructure to an environment, based on the current branch being deployed: branch `dev` - validation environment; branch `prod` - production environment

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
  "id": "generated-uuid",
  "uploadUrl": "https://s3-presigned-url"
}
```
Use the `uploadUrl` to upload the file using a `PUT` request.

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


### **4. Update a File**
Make a `PUT` request to the `update` endpoint with the following JSON payload:
```json
{
  "filename": "new_name.txt",
  "password": "your-secure-password",
  "uuid": "your-uuid"
}
```
Response:
```json
{
  "id": "your-uuid",
  "uploadUrl": "https://s3-presigned-url"
}
```
Use the `presigned_url` to upload the file using a `PUT` request.

### **5. Delete a File**
Make a `DELETE` request to the `delete` endpoint with the file UUID and password:
```json
{
  "password": "your-secure-password",
  "uuid": "your-uuid"
}
```
Response example:
```json
{
  "id": "your-uuid"
}
```
