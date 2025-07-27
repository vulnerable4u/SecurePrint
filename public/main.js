document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = '/api';

    // --- Element Selectors ---
    const sections = document.querySelectorAll('.page-section');
    const uploadModal = document.getElementById('upload-modal');
    const uploadBackdrop = document.getElementById('upload-modal-backdrop');
    const uploadResult = document.getElementById('upload-result');
    const accessCodeEl = document.getElementById('accessCode');
    const uploadInitialView = document.getElementById('upload-initial-view');
    const uploadActionsInitial = document.getElementById('upload-actions-initial');
    const uploadActionsSuccess = document.getElementById('upload-actions-success');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('drop-zone');
    const qrCodeContainer = document.getElementById('qr-code-container');
    const printCodeForm = document.getElementById('printCodeForm');
    const printActions = document.getElementById('print-actions');
    const passwordSection = document.getElementById('password-section');
    const converterInitial = document.getElementById('converter-initial-state');
    const converterLoading = document.getElementById('converter-loading-state');
    const converterSuccess = document.getElementById('converter-success-state');
    const converterSecured = document.getElementById('converter-secured-state');
    const convertedAccessCodeEl = document.getElementById('convertedAccessCode');
    const convertedQrCodeContainer = document.getElementById('converted-qr-code-container');
    const downloadLink = document.getElementById('downloadLink');
    const convertFileInput = document.getElementById('convertFileInput');
    const convertFormatSelect = document.getElementById('convertFormatSelect');
    const confirmationMessage = document.getElementById('confirmation-message');
    const openUploadModalBtn = document.getElementById('openUploadModalBtn');
    const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
    const resetConverterBtns = document.querySelectorAll('.reset-converter-btn');

    let currentPrintInfo = null;
    let lastConvertedFile = null;

    // --- QR Code Instance ---
    const qrCode = new QRCodeStyling({
        width: 110, height: 110, type: "svg",
        dotsOptions: { color: "#3b82f6", type: "rounded" },
        cornersSquareOptions: { type: "extra-rounded" },
        backgroundOptions: { color: "transparent" },
    });

    // --- Page Navigation Logic ---
    const switchPage = (targetId) => {
        if (!targetId) targetId = 'home'; // Default to home page
        
        sections.forEach(section => {
            // Using the 'active' class from the CSS to control visibility
            if (section.id === targetId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
        window.scrollTo(0, 0);
    };

    document.querySelectorAll('[data-section]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.section;
            switchPage(targetId);
            history.pushState(null, '', `#${targetId}`);
        });
    });

    // --- Initial Page Load ---
    const currentHash = window.location.hash.substring(1) || 'home';
    switchPage(currentHash);
    window.onpopstate = () => switchPage(window.location.hash.substring(1) || 'home');


    // --- UI Helper Functions ---
    function showConfirmation(message, isError = false) {
        if (!confirmationMessage) return;
        confirmationMessage.textContent = message;
        confirmationMessage.classList.remove('hidden');
        confirmationMessage.classList.toggle('bg-red-500', isError);
        confirmationMessage.classList.toggle('bg-green-500', !isError);
        setTimeout(() => {
            confirmationMessage.classList.add('hidden');
        }, 4000);
    }

    function setButtonLoading(button, isLoading, defaultText = '', spinnerClass = 'spinner-light') {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<div class="${spinnerClass}"></div>`;
        } else {
            button.disabled = false;
            button.innerHTML = defaultText;
        }
    }

    // --- Upload Modal Logic ---
    function openUploadModal() {
        uploadInitialView.classList.remove('hidden');
        uploadResult.classList.add('hidden');
        uploadActionsInitial.classList.remove('hidden');
        uploadActionsSuccess.classList.add('hidden');
        document.getElementById('uploadForm').reset();
        updateFileName(fileInput);
        uploadModal.classList.remove('hidden');
        uploadBackdrop.classList.remove('hidden');
    }

    function closeUploadModal() {
        uploadModal.classList.add('hidden');
        uploadBackdrop.classList.add('hidden');
    }
    
    if (openUploadModalBtn) openUploadModalBtn.addEventListener('click', openUploadModal);
    if (closeUploadModalBtn) closeUploadModalBtn.addEventListener('click', closeUploadModal);


    function updateFileName(input) {
        document.getElementById('fileName').textContent = input.files.length > 0 ? input.files[0].name : 'No file selected';
    }

    // --- Drag and Drop Logic ---
    if(dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                updateFileName(fileInput);
            }
        });
    }
    if(fileInput) fileInput.addEventListener('change', () => updateFileName(fileInput));


    // --- Form Submission & API Calls ---

    // 1. Upload Form (in Modal)
    const uploadForm = document.getElementById('uploadForm');
    if(uploadForm) {
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (fileInput.files.length === 0) return showConfirmation('Please select a file to upload.', true);
            
            const formData = new FormData(this);
            const submitBtn = document.getElementById('uploadSubmitBtn');
            setButtonLoading(submitBtn, true, 'Generate Code', 'spinner-light');
            
            try {
                const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Upload failed');
                
                accessCodeEl.textContent = data.accessCode;
                qrCode.update({ data: data.accessCode });
                qrCode.append(qrCodeContainer);

                uploadResult.classList.remove('hidden');
                uploadInitialView.classList.add('hidden');
                uploadActionsInitial.classList.add('hidden');
                uploadActionsSuccess.classList.remove('hidden');

            } catch (error) { 
                showConfirmation(error.message, true); 
            } finally {
                setButtonLoading(submitBtn, false, 'Generate Code'); 
            }
        });
    }


    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if(copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const accessCode = accessCodeEl.textContent;
            if (!accessCode) return;
            navigator.clipboard.writeText(accessCode).then(() => {
                showConfirmation('Code copied to clipboard!');
                closeUploadModal();
            }, () => {
                showConfirmation('Could not copy code.', true);
            });
        });
    }

    const cancelAndDeleteBtn = document.getElementById('cancelAndDeleteBtn');
    if(cancelAndDeleteBtn) {
        cancelAndDeleteBtn.addEventListener('click', async () => {
            const accessCode = accessCodeEl.textContent;
            if (!accessCode) {
                closeUploadModal();
                return;
            }
            try {
                await fetch(`${BACKEND_URL}/file/${accessCode}`, { method: 'DELETE' });
                showConfirmation('Upload canceled and file deleted.');
            } catch (error) {
                console.error('Error during file deletion request:', error);
            } finally {
                closeUploadModal();
            }
        });
    }


    // 2. Print Form (Print Shop)
    if(printCodeForm) {
        printCodeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const accessCode = document.getElementById('codeInput').value.trim().toUpperCase();
            if (!accessCode) return showConfirmation('Please enter an access code.', true);

            printActions.classList.add('hidden');
            
            try {
                const response = await fetch(`${BACKEND_URL}/file-info/${accessCode}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || `HTTP error! Status: ${response.status}`);
                
                currentPrintInfo = { ...data, accessCode };
                printActions.classList.remove('hidden');

            } catch (error) { 
                showConfirmation(error.message, true); 
                currentPrintInfo = null;
            }
        });
    }

    async function printFile(accessCode) {
        const printBtn = document.getElementById('printBtn');
        setButtonLoading(printBtn, true, '<i class="fas fa-print mr-2"></i>Print Document', 'spinner-light');

        try {
            const response = await fetch(`${BACKEND_URL}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                try {
                    iframe.contentWindow.focus();
                    
                    iframe.contentWindow.onafterprint = () => {
                        console.log("Print dialog closed.");
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL(url);
                    };

                    iframe.contentWindow.print();
                    showConfirmation('Print dialog opened. The access code is now deleted.');

                } catch (e) {
                    showConfirmation('Could not open print dialog.', true);
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }
            };
        } catch (error) {
            showConfirmation(error.message, true);
        } finally {
            setButtonLoading(printBtn, false, '<i class="fas fa-print mr-2"></i>Print Document');
        }
    }

    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (currentPrintInfo) {
                printFile(currentPrintInfo.accessCode);
            }
        });
    }


    // 3. Converter Form
    function resetConverter() {
        converterInitial.classList.remove('hidden');
        converterLoading.classList.add('hidden');
        converterSuccess.classList.add('hidden');
        converterSecured.classList.add('hidden');
        document.getElementById('convertForm').reset();
        updateTargetFormats();
    }
    
    resetConverterBtns.forEach(btn => btn.addEventListener('click', resetConverter));


    const allFormats = { 'pdf': 'PDF', 'docx': 'Word (docx)', 'txt': 'Text (txt)', 'pptx': 'PowerPoint (pptx)', 'xlsx': 'Excel (xlsx)' };

    function updateTargetFormats() {
        if(!convertFileInput) return;
        const file = convertFileInput.files[0];
        const sourceExtension = file ? file.name.split('.').pop().toLowerCase() : null;
        convertFormatSelect.innerHTML = '';
        const availableFormats = Object.keys(allFormats).filter(format => format !== sourceExtension);

        if (availableFormats.length === 0 || !file) {
            convertFormatSelect.innerHTML = '<option value="" disabled selected>Select a file first</option>';
        } else {
            availableFormats.forEach(format => {
                const option = document.createElement('option');
                option.value = format;
                option.textContent = `Convert to ${allFormats[format]}`;
                convertFormatSelect.appendChild(option);
            });
        }
    }

    if(convertFileInput) convertFileInput.addEventListener('change', updateTargetFormats);
    updateTargetFormats();

    const convertForm = document.getElementById('convertForm');
    if(convertForm) {
        convertForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            converterInitial.classList.add('hidden');
            converterLoading.classList.remove('hidden');

            try {
                const response = await fetch(`${BACKEND_URL}/convert`, { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Conversion failed');
                
                downloadLink.href = data.downloadUrl;
                lastConvertedFile = { tempFileName: data.tempFileName };
                
                converterLoading.classList.add('hidden');
                converterSuccess.classList.remove('hidden');
            } catch (error) { 
                showConfirmation(error.message, true);
                resetConverter();
            }
        });
    }

    const secureConvertedBtn = document.getElementById('secure-converted-btn');
    if(secureConvertedBtn) {
        secureConvertedBtn.addEventListener('click', async function() {
            if (!lastConvertedFile) return;
            const submitBtn = this;
            setButtonLoading(submitBtn, true, 'Secure This File', 'spinner-light');
            try {
                const response = await fetch(`${BACKEND_URL}/secure-converted-file`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(lastConvertedFile) 
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not secure file.');
                
                convertedAccessCodeEl.textContent = data.accessCode;
                qrCode.update({ data: data.accessCode });
                qrCode.append(convertedQrCodeContainer);

                converterSuccess.classList.add('hidden');
                converterSecured.classList.remove('hidden');
            } catch (error) { 
                showConfirmation(error.message, true); 
            } finally { 
                setButtonLoading(submitBtn, false, 'Secure This File'); 
            }
        });
    }
});