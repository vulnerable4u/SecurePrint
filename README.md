SecurePrint
SecurePrint is a web-based solution designed to address privacy risks in public print shops by enabling users to share documents securely without revealing personal contact details. It implements encrypted file transfer and one-time access codes to restrict unauthorized access, download, or modification.

Features
Encrypted file upload and storage

Local antivirus scanning with ClamAV on upload

One-time access codes for secure document retrieval

No personal contact details required

Simple and secure web interface

Prerequisites
This application requires the ClamAV antivirus engine to be installed and running on the server where the backend is hosted. The clamd daemon must be active for the scanner to work.

On Debian/Ubuntu:

sudo apt-get update
sudo apt-get install clamav-daemon

On CentOS/RHEL:

sudo yum install -y clamav-server clamav-data clamav-update clamav-filesystem clamav clamav-lib
# You may need to perform additional configuration for SELinux and clamd.

Please ensure the clamdscan binary is available in the system's PATH or configure the correct path in routes/upload.js.

Setup and Run
Backend
Install dependencies:

npm install

Start the backend server:

npm start

The backend server will run on the port specified in your .env file, or 3001 by default.

Frontend
The frontend files are located in the public/ directory and are served automatically by the backend. Simply navigate to the backend URL (e.g., http://localhost:3001) in your browser.

Tech Stack
Node.js with Express for backend

ClamAV (node-clamscan) for virus scanning

Multer for file uploads

Bcrypt for password hashing

Short-UUID for generating access codes

Vanilla JavaScript and Tailwind CSS for frontend

Notes
Uploaded and converted files are stored temporarily in the uploads/ directory.

Files and access codes expire based on the configured expiry time or after download.