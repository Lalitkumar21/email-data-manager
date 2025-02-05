document.addEventListener('DOMContentLoaded', function() {
    const uploadContainer = document.querySelector('.upload-container');
    const browseButton = document.querySelector('.browse-button');
    const fileInput = document.getElementById('file-upload');
    const fileDataContent = document.getElementById('file-data-content');
    const fileDataSection = document.querySelector('.file-data');
    const successMessage = document.createElement('p');
    successMessage.classList.add('success-message');
    fileDataContent.parentNode.insertBefore(successMessage, fileDataContent);

    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(tabId) {
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            switchTab(tabId);
        });
    });

    // Initialize first tab
    document.getElementById('email-config').classList.add('active');

    // Handle drag and drop events
    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.style.borderColor = '#4a90e2';
    });

    uploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadContainer.style.borderColor = '#2a303c';
    });

    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.style.borderColor = '#2a303c';
        handleFiles(e.dataTransfer.files);
    });

    // Handle browse button click
    browseButton.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        e.preventDefault(); // Prevent default behavior
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        if (!sessionStorage.getItem('emailVerified')) {
            alert('Please verify your email credentials first');
            return;
        }

        if (files.length === 0) return;

        const file = files[0];
        if (!validateFile(file)) {
            successMessage.textContent = 'Please upload a valid CSV or Excel file under 200MB';
            successMessage.style.color = 'red';
            return;
        }

        uploadFile(file);
    }

    function validateFile(file) {
        const validTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/csv',
            '.csv'
        ];
        const maxSize = 200 * 1024 * 1024; // 200MB

        const fileType = file.type || file.name.split('.').pop().toLowerCase();
        return (validTypes.includes(fileType) || file.name.endsWith('.csv')) && file.size <= maxSize;
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            successMessage.textContent = 'Uploading file...';
            successMessage.style.color = '#3b82f6';
            fileDataSection.style.display = 'none';

            const response = await fetch('http://localhost:3001/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            successMessage.textContent = `File uploaded successfully! Total rows: ${data.totalRows}`;
            successMessage.style.color = 'green';

            // Update email column selector with available columns
            const emailColumnSelect = document.getElementById('email-column');
            emailColumnSelect.innerHTML = '<option value="">Select email column</option>';
            
            if (data.columns) {
                data.columns.forEach(column => {
                    const option = document.createElement('option');
                    option.value = column;
                    option.textContent = column;
                    // Try to automatically select column that looks like an email column
                    if (column.toLowerCase().includes('email') || 
                        column.toLowerCase().includes('e-mail') || 
                        column.toLowerCase().includes('mail')) {
                        option.selected = true;
                    }
                    emailColumnSelect.appendChild(option);
                });
            }

            if (data.success && data.data && Array.isArray(data.data)) {
                displayFileData(data.data);
                localStorage.setItem('previewData', JSON.stringify(data.data));
                fileDataSection.style.display = 'block';

                // Trigger email column change if one was automatically selected
                const event = new Event('change');
                emailColumnSelect.dispatchEvent(event);
            }
        } catch (error) {
            console.error('Upload error:', error);
            successMessage.textContent = `Upload failed: ${error.message}`;
            successMessage.style.color = 'red';
            fileDataSection.style.display = 'none';
        }

        fileInput.value = '';
    }

    function displayFileData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error('Invalid data format for preview');
            return;
        }

        fileDataContent.innerHTML = '';
        const headers = Object.keys(data[0]); // Define headers once here

        // Update email column selector
        const emailColumnSelect = document.getElementById('email-column');
        emailColumnSelect.innerHTML = '<option value="">Select email column</option>';
        
        headers.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            emailColumnSelect.appendChild(option);
        });

        // Create preview header
        const previewHeader = document.createElement('div');
        previewHeader.classList.add('preview-header');
        
        const previewTitle = document.createElement('h2');
        previewTitle.textContent = 'Data Preview';
        previewTitle.classList.add('preview-title');
        
        const previewCount = document.createElement('span');
        previewCount.textContent = `Showing ${data.length} rows`;
        previewCount.classList.add('preview-count');
        
        previewHeader.appendChild(previewTitle);
        previewHeader.appendChild(previewCount);
        fileDataContent.appendChild(previewHeader);

        // Create table
        const table = document.createElement('table');
        table.classList.add('file-data-table');

        // Create headers
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        fileDataContent.appendChild(table);
        fileDataSection.classList.add('show');
    }

    // Restore preview data if it exists in localStorage
    const storedPreviewData = localStorage.getItem('previewData');
    if (storedPreviewData) {
        try {
            const parsedData = JSON.parse(storedPreviewData);
            displayFileData(parsedData);
        } catch (e) {
            console.error('Error restoring preview data:', e);
        }
    }

    // Prevent form submission or other default actions that might cause a page reload
    document.querySelector('form')?.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    // Email verification handling
    const emailForm = document.getElementById('email-config-form');
    const verifyButton = emailForm.querySelector('.verify-button');
    
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        verifyButton.textContent = 'Verifying...';
        verifyButton.disabled = true;
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const aiKeyInput = document.getElementById('ai-key');
        
        // Add helper text for app password
        const helperText = document.createElement('p');
        helperText.classList.add('helper-text');
        helperText.innerHTML = 'Please use an <a href="https://support.google.com/accounts/answer/185833" target="_blank">App Password</a> from your Google Account';
        
        if (!passwordInput.nextElementSibling) {
            passwordInput.parentNode.insertBefore(helperText, passwordInput.nextSibling);
        }

        try {
            const response = await fetch('http://localhost:3001/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    password: passwordInput.value
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Verification failed');
            }
            
            if (result.success) {
                verifyButton.textContent = 'Verified ✓';
                verifyButton.classList.add('verified');
                uploadContainer.style.opacity = '1';
                uploadContainer.style.pointerEvents = 'auto';
                sessionStorage.setItem('emailVerified', 'true');
                if (aiKeyInput.value) {
                    sessionStorage.setItem('openaiKey', aiKeyInput.value);
                }
                updateApiStatus();
                switchTab('upload-data');
            } else {
                throw new Error(result.message || 'Verification failed');
            }
        } catch (error) {
            console.error('Verification error:', error);
            verifyButton.textContent = 'Verification Failed';
            alert('Verification failed: ' + (error.message || 'Please check your credentials and try again'));
        } finally {
            if (!verifyButton.classList.contains('verified')) {
                verifyButton.disabled = false;
                setTimeout(() => {
                    verifyButton.textContent = 'Verify Credentials';
                }, 3000);
            }
        }
    });

    // Initially disable file upload until email is verified
    uploadContainer.style.opacity = '0.5';
    uploadContainer.style.pointerEvents = 'none';

    // Check authentication status on page load
    const isAuthenticated = sessionStorage.getItem('emailVerified');
    if (isAuthenticated === 'true') {
        uploadContainer.style.opacity = '1';
        uploadContainer.style.pointerEvents = 'auto';
        const verifyButton = document.querySelector('.verify-button');
        if (verifyButton) {
            verifyButton.textContent = 'Verified ✓';
            verifyButton.classList.add('verified');
        }
    }

    // Clear preview data only when user manually reloads
    window.addEventListener('beforeunload', function(e) {
        localStorage.removeItem('previewData'); // Clear only preview data
        // Keep authentication state in sessionStorage
    });

    // Email sending functionality
    const emailComposeForm = document.getElementById('email-compose-form');
    const sendButton = emailComposeForm.querySelector('.send-button');
    const recipientsPreview = document.querySelector('.recipients-preview');

    // Update recipients preview when data is loaded
    function updateRecipientsPreview(data, emailColumn) {
        if (!data || !data.length || !emailColumn) return;
        
        const recipientsPreview = document.querySelector('.recipients-preview');
        recipientsPreview.innerHTML = '<h3>Recipients Preview:</h3>';
        const previewList = document.createElement('div');
        
        const validEmails = data
            .map(row => row[emailColumn])
            .filter(email => email && isValidEmail(email));

        const invalidEmails = data
            .map(row => row[emailColumn])
            .filter(email => email && !isValidEmail(email));

        // Show valid emails
        validEmails.slice(0, 5).forEach(email => {
            const recipientDiv = document.createElement('div');
            recipientDiv.className = 'recipient valid';
            recipientDiv.textContent = email;
            previewList.appendChild(recipientDiv);
        });

        // Show count of remaining valid emails
        if (validEmails.length > 5) {
            const moreRecipients = document.createElement('div');
            moreRecipients.className = 'recipient more';
            moreRecipients.textContent = `... and ${validEmails.length - 5} more valid recipients`;
            previewList.appendChild(moreRecipients);
        }

        // Show invalid emails count if any
        if (invalidEmails.length > 0) {
            const invalidCount = document.createElement('div');
            invalidCount.className = 'recipient invalid';
            invalidCount.textContent = `⚠️ ${invalidEmails.length} invalid email addresses found`;
            previewList.appendChild(invalidCount);
        }

        const totalCount = document.createElement('div');
        totalCount.className = 'recipient-count';
        totalCount.textContent = `Total valid email addresses: ${validEmails.length}`;
        
        recipientsPreview.appendChild(previewList);
        recipientsPreview.appendChild(totalCount);
        
        const sendButton = document.querySelector('.send-button');
        sendButton.disabled = validEmails.length === 0;
    }

    // Update original displayFileData function
    const originalDisplayFileData = displayFileData;
    displayFileData = function(data) {
        originalDisplayFileData(data);
        updateRecipientsPreview(data);
        updateTemplateVariables(data);
    };

    // Handle email sending
    emailComposeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailColumn = document.getElementById('email-column').value;
        const subject = document.getElementById('email-subject').value;
        const body = document.getElementById('email-body').value;
        const previewData = JSON.parse(localStorage.getItem('previewData') || '[]');

        if (!emailColumn) {
            alert('Please select the email column');
            return;
        }

        if (!previewData.length) {
            alert('Please upload a file with recipient data first');
            return;
        }

        const validRecipients = previewData.filter(row => {
            const email = row[emailColumn];
            return email && isValidEmail(email);
        });

        if (validRecipients.length === 0) {
            alert('No valid email addresses found in the selected column');
            return;
        }

        if (!confirm(`Are you sure you want to send this email to ${validRecipients.length} recipients?`)) {
            return;
        }

        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        const emailBody = document.getElementById('email-body').value;
    
        // Process each recipient's email with their data
        const processedRecipients = validRecipients.map(recipient => ({
            ...recipient,
            processedBody: processTemplate(emailBody, recipient)
        }));

        try {
            const response = await fetch('http://localhost:3001/send-emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject,
                    recipients: processedRecipients,
                    emailColumn
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`Emails sent successfully!\n${result.message}`);
                if (result.errors && result.errors.length > 0) {
                    console.warn('Some errors occurred:', result.errors);
                }
                emailComposeForm.reset();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error sending emails:', error);
            alert('Failed to send emails: ' + error.message);
        } finally {
            sendButton.disabled = false;
            sendButton.textContent = 'Send Emails';
        }
    });

    // Update recipients preview when email column changes
    document.getElementById('email-column').addEventListener('change', function(e) {
        const selectedColumn = e.target.value;
        const previewData = JSON.parse(localStorage.getItem('previewData') || '[]');
        
        if (!selectedColumn || !previewData.length) {
            return;
        }

        updateRecipientsPreview(previewData, selectedColumn);
    });

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Add after the file upload handling code
    function updateTemplateVariables(data) {
        if (!data || !data.length) return;
        
        const variablesList = document.getElementById('variables-list');
        variablesList.innerHTML = '';
        
        const columns = Object.keys(data[0]);
        columns.forEach(column => {
            const tag = document.createElement('span');
            tag.className = 'variable-tag';
            tag.textContent = `{${column}}`;
            tag.addEventListener('click', () => {
                const emailBody = document.getElementById('email-body');
                const cursorPos = emailBody.selectionStart;
                const textBefore = emailBody.value.substring(0, cursorPos);
                const textAfter = emailBody.value.substring(cursorPos);
                emailBody.value = textBefore + `{${column}}` + textAfter;
                emailBody.focus();
            });
            variablesList.appendChild(tag);
        });
    }

    // Add after displayFileData function
    document.getElementById('body-type').addEventListener('change', function(e) {
        const aiSection = document.querySelector('.ai-section');
        const manualSection = document.querySelector('.manual-section');
        
        if (e.target.value === 'ai') {
            aiSection.style.display = 'block';
            manualSection.style.display = 'none';
        } else {
            aiSection.style.display = 'none';
            manualSection.style.display = 'block';
        }
    });

    document.getElementById('generate-content').addEventListener('click', async function() {
        const openaiKey = sessionStorage.getItem('openaiKey');
        if (!openaiKey) {
            alert('Please provide your OpenAI API key in the Email Configuration tab');
            return;
        }

        const prompt = document.getElementById('ai-prompt').value;
        const data = JSON.parse(localStorage.getItem('previewData') || '[]');
        
        if (!prompt) {
            alert('Please enter a prompt for the AI');
            return;
        }

        if (!data.length) {
            alert('Please upload data first to use available fields');
            return;
        }

        try {
            this.disabled = true;
            this.textContent = 'Generating...';
            
            console.log('Sending request with API key:', openaiKey.substring(0, 10) + '...');
            
            const response = await fetch('http://localhost:3001/generate-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-OpenAI-Key': openaiKey
                },
                body: JSON.stringify({
                    prompt: prompt,
                    availableFields: Object.keys(data[0] || {})
                })
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);

            if (!response.ok) {
                throw new Error(result.message || 'Failed to generate content');
            }

            if (result.success && result.content) {
                document.getElementById('email-body').value = result.content;
                document.getElementById('body-type').value = 'manual';
                document.querySelector('.ai-section').style.display = 'none';
                document.querySelector('.manual-section').style.display = 'block';
                
                const successMessage = document.createElement('div');
                successMessage.className = 'ai-success-message';
                successMessage.textContent = '✓ AI content generated successfully';
                this.parentNode.appendChild(successMessage);
                setTimeout(() => successMessage.remove(), 3000);
            } else {
                throw new Error('No content received from AI');
            }
        } catch (error) {
            console.error('Content generation error:', error);
            alert('Failed to generate content: ' + error.message);
        } finally {
            this.disabled = false;
            this.textContent = 'Generate Content';
        }
    });

    // Update the email sending code to handle template variables
    function processTemplate(template, data) {
        return template.replace(/\{([^}]+)\}/g, (match, field) => {
            return data[field] || match;
        });
    }

    // Add API key management
    const updateApiKeyBtn = document.getElementById('update-api-key');
    const apiStatus = document.querySelector('.api-status');
    
    function updateApiStatus() {
        const apiKey = sessionStorage.getItem('openaiKey');
        if (apiKey) {
            apiStatus.textContent = '✓ AI features are enabled';
            apiStatus.className = 'api-status active';
        } else {
            apiStatus.textContent = 'AI features are currently disabled. Add an API key to enable them.';
            apiStatus.className = 'api-status inactive';
        }
    }

    updateApiKeyBtn.addEventListener('click', async function() {
        const newApiKey = document.getElementById('update-openai-key').value;
        if (!newApiKey) {
            alert('Please enter an API key');
            return;
        }

        try {
            this.disabled = true;
            this.textContent = 'Verifying...';

            const response = await fetch('http://localhost:3001/verify-openai-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ apiKey: newApiKey })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to verify API key');
            }

            const result = await response.json();
            
            if (result.success) {
                sessionStorage.setItem('openaiKey', newApiKey);
                document.getElementById('update-openai-key').value = '';
                updateApiStatus();
                alert('API key updated successfully');
            } else {
                throw new Error(result.message || 'Verification failed');
            }
        } catch (error) {
            console.error('API key verification error:', error);
            alert('Failed to verify API key: ' + error.message);
        } finally {
            this.disabled = false;
            this.textContent = 'Update API Key';
        }
    });

    // Update generate content handler
    document.getElementById('generate-content').addEventListener('click', async function() {
        const openaiKey = sessionStorage.getItem('openaiKey');
        if (!openaiKey) {
            const addKey = confirm('AI features require an OpenAI API key. Would you like to add one now?');
            if (addKey) {
                switchTab('email-config');
                document.getElementById('update-openai-key').focus();
            }
            return;
        }

        const prompt = document.getElementById('ai-prompt').value;
        const data = JSON.parse(localStorage.getItem('previewData') || '[]');
        
        if (!prompt) {
            alert('Please enter a prompt for the AI');
            return;
        }

        if (!data.length) {
            alert('Please upload data first to use available fields');
            return;
        }

        try {
            this.disabled = true;
            this.textContent = 'Generating...';
            
            const response = await fetch('http://localhost:3001/generate-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`  // Changed from X-OpenAI-Key
                },
                body: JSON.stringify({
                    provider: 'openai',
                    prompt: prompt,
                    availableFields: Object.keys(data[0] || {})
                })
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to generate content');
            }

            if (result.success && result.content) {
                // Switch to manual mode to show the generated content
                document.getElementById('body-type').value = 'manual';
                document.querySelector('.ai-section').style.display = 'none';
                document.querySelector('.manual-section').style.display = 'block';
                
                // Set the generated content
                document.getElementById('email-body').value = result.content;
                
                // Show success notification
                const successMessage = document.createElement('div');
                successMessage.className = 'ai-success-message';
                successMessage.textContent = '✓ AI content generated successfully';
                this.parentNode.appendChild(successMessage);
                setTimeout(() => successMessage.remove(), 3000);
            } else {
                throw new Error('No content received from AI');
            }
        } catch (error) {
            console.error('Content generation error:', error);
            alert('Failed to generate content: ' + error.message);
        } finally {
            this.disabled = false;
            this.textContent = 'Generate Content';
        }
    });

    // Initialize API status on page load
    updateApiStatus();
});

document.getElementById('body-type').addEventListener('change', function(e) {
    const aiSection = document.querySelector('.ai-section');
    const manualSection = document.querySelector('.manual-section');
    const openaiKey = sessionStorage.getItem('openaiKey');
    
    if (e.target.value === 'ai') {
        if (!openaiKey) {
            // Show API required message and hide compose form
            document.getElementById('api-required-message').style.display = 'block';
            document.getElementById('email-compose-content').style.display = 'none';
            e.target.value = 'manual'; // Reset to manual mode
        } else {
            aiSection.style.display = 'block';
            manualSection.style.display = 'none';
            document.getElementById('api-required-message').style.display = 'none';
            document.getElementById('email-compose-content').style.display = 'block';
        }
    } else {
        aiSection.style.display = 'none';
        manualSection.style.display = 'block';
        document.getElementById('api-required-message').style.display = 'none';
        document.getElementById('email-compose-content').style.display = 'block';
    }
});

// Update the updateApiStatus function
function updateApiStatus() {
    const apiKey = sessionStorage.getItem('openaiKey');
    const apiStatus = document.querySelector('.api-status');
    const aiOption = document.querySelector('option[value="ai"]');
    
    if (apiKey) {
        apiStatus.textContent = '✓ AI features are enabled';
        apiStatus.className = 'api-status active';
        aiOption.disabled = false;
        document.getElementById('api-required-message').style.display = 'none';
        document.getElementById('email-compose-content').style.display = 'block';
    } else {
        apiStatus.textContent = 'AI features are currently disabled. Add an API key to enable them.';
        apiStatus.className = 'api-status inactive';
        aiOption.disabled = true;
        // Reset to manual mode if currently on AI
        if (document.getElementById('body-type').value === 'ai') {
            document.getElementById('body-type').value = 'manual';
            document.querySelector('.ai-section').style.display = 'none';
            document.querySelector('.manual-section').style.display = 'block';
        }
    }
}

// Add this after successful API key verification
updateApiKeyBtn.addEventListener('click', async function() {
    // ...existing verification code...
    
    if (result.success) {
        sessionStorage.setItem('openaiKey', newApiKey);
        document.getElementById('update-openai-key').value = '';
        updateApiStatus();
        document.getElementById('api-required-message').style.display = 'none';
        document.getElementById('email-compose-content').style.display = 'block';
        alert('API key updated successfully');
    }
    
    // ...rest of the code...
});

// Initialize API status and visibility on page load
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    updateApiStatus();
    const openaiKey = sessionStorage.getItem('openaiKey');
    if (!openaiKey && document.getElementById('body-type').value === 'ai') {
        document.getElementById('api-required-message').style.display = 'block';
        document.getElementById('email-compose-content').style.display = 'none';
    }
});

// Add functionality to test email sending
async function testEmailConnection(email, password) {
    try {
        const response = await fetch('http://localhost:3001/test-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Email test failed:', error);
        return false;
    }
}

// Add preview functionality
function previewEmail(subject, body, recipient) {
    const previewWindow = window.open('', 'Email Preview', 'width=600,height=400');
    const processedBody = processTemplate(body, recipient);
    
    previewWindow.document.write(`
        <div style="padding: 20px;">
            <h2>Email Preview</h2>
            <p><strong>To:</strong> ${recipient[emailColumn]}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr>
            <div>${processedBody}</div>
        </div>
    `);
}

// Add file validation improvements
function validateFile(file) {
    const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/csv',
        '.csv'
    ];
    const maxSize = 200 * 1024 * 1024; // 200MB

    const fileType = file.type || file.name.split('.').pop().toLowerCase();
    if (!(validTypes.includes(fileType) || file.name.endsWith('.csv')) || file.size > maxSize) {
        return false;
    }

    // Add additional checks
    if (file.size === 0) {
        throw new Error('File is empty');
    }
    
    if (file.name.includes('..')) {
        throw new Error('Invalid file name');
    }
    
    return true;
}

// Add these functions for credential management
function storeCredentials(email, password, aiProvider, aiKey) {
    sessionStorage.setItem('emailCredentials', JSON.stringify({
        email: email,
        password: password
    }));
    
    if (aiProvider && aiKey) {
        sessionStorage.setItem('aiCredentials', JSON.stringify({
            provider: aiProvider,
            key: aiKey
        }));
    }
}

function getStoredCredentials() {
    return {
        email: JSON.parse(sessionStorage.getItem('emailCredentials') || '{}'),
        ai: JSON.parse(sessionStorage.getItem('aiCredentials') || '{}')
    };
}

// Update the form submission handler
emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const aiProvider = document.getElementById('ai-provider').value;
    const aiKey = document.getElementById('ai-key').value;

    try {
        // Verify email credentials
        const response = await fetch('http://localhost:3001/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();
        
        if (result.success) {
            // Store credentials in session
            storeCredentials(email, password, aiProvider, aiKey);
            sessionStorage.setItem('emailVerified', 'true');
            // ...rest of success handling
        }
    } catch (error) {
        console.error('Verification error:', error);
    }
});

// Update the send email function to use stored credentials
async function sendEmails(data) {
    const credentials = getStoredCredentials();
    if (!credentials.email) {
        throw new Error('Email credentials not found');
    }
    
    // Add credentials to request
    // ...existing send email code...
}

// Add after DOMContentLoaded event handler

// Handle AI provider selection change
document.getElementById('ai-provider').addEventListener('change', function(e) {
    const provider = e.target.value;
    const links = document.querySelectorAll('#api-provider-links a');
    
    // Hide all links first
    links.forEach(link => link.style.display = 'none');
    
    // Show only the relevant link
    const activeLink = document.querySelector(`#api-provider-links a[data-provider="${provider}"]`);
    if (activeLink) {
        activeLink.style.display = 'inline';
    }
});

// Initialize with default selection (OpenAI)
document.querySelector('#api-provider-links a[data-provider="openai"]').style.display = 'inline';

// ...existing code...

// Add this function for AI provider management
function updateAIProviderUI(provider) {
    // Update API key input label
    const apiKeyLabel = document.querySelector('label[for="ai-key"]');
    const apiKeyInput = document.getElementById('ai-key');
    const helperText = document.querySelector('#api-provider-links');
    
    const providers = {
        openai: {
            label: 'OpenAI API Key',
            placeholder: 'Enter your OpenAI API key',
            link: 'https://platform.openai.com/api-keys',
            linkText: 'OpenAI Dashboard'
        },
        anthropic: {
            label: 'Claude API Key',
            placeholder: 'Enter your Anthropic API key',
            link: 'https://console.anthropic.com/account/keys',
            linkText: 'Anthropic Console'
        },
        gemini: {
            label: 'Gemini API Key',
            placeholder: 'Enter your Google AI API key',
            link: 'https://makersuite.google.com/app/apikey',
            linkText: 'Google AI Studio'
        }
    };

    const selectedProvider = providers[provider];
    apiKeyLabel.textContent = selectedProvider.label;
    apiKeyInput.placeholder = selectedProvider.placeholder;
    
    // Update helper text with correct link
    helperText.innerHTML = `Get your API key from: <a href="${selectedProvider.link}" target="_blank">${selectedProvider.linkText}</a>`;
}

// Update AI provider change handler
document.getElementById('ai-provider').addEventListener('change', function(e) {
    updateAIProviderUI(e.target.value);
});

// Initialize with default provider (OpenAI)
document.addEventListener('DOMContentLoaded', function() {
    // ...existing initialization code...
    updateAIProviderUI('openai');
});

// ...existing code...

document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...

    // Ensure all elements are correctly referenced
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const aiProviderSelect = document.getElementById('ai-provider');
    const aiKeyInput = document.getElementById('ai-key');
    const verifyButton = document.querySelector('.verify-button');
    const updateApiKeyBtn = document.getElementById('update-api-key');
    const apiStatus = document.querySelector('.api-status');

    // Add this function for AI provider management
    function updateAIProviderUI(provider) {
        // Update API key input label
        const apiKeyLabel = document.querySelector('label[for="ai-key"]');
        const apiKeyInput = document.getElementById('ai-key');
        
        const providers = {
            openai: {
                label: 'OpenAI API Key',
                placeholder: 'Enter your OpenAI API key'
            },
            anthropic: {
                label: 'Claude API Key',
                placeholder: 'Enter your Anthropic API key'
            },
            gemini: {
                label: 'Gemini API Key',
                placeholder: 'Enter your Google AI API key'
            }
        };

        const selectedProvider = providers[provider];
        apiKeyLabel.textContent = selectedProvider.label;
        apiKeyInput.placeholder = selectedProvider.placeholder;
    }

    // Update AI provider change handler
    aiProviderSelect.addEventListener('change', function(e) {
        updateAIProviderUI(e.target.value);
    });

    // Initialize with default provider (OpenAI)
    updateAIProviderUI('openai');

    // ...existing code...

    // Update the form submission handler
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;
        const aiProvider = aiProviderSelect.value;
        const aiKey = aiKeyInput.value;

        try {
            // Verify email credentials
            const response = await fetch('http://localhost:3001/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();
            
            if (result.success) {
                // Store credentials in session
                storeCredentials(email, password, aiProvider, aiKey);
                sessionStorage.setItem('emailVerified', 'true');
                // ...rest of success handling
            }
        } catch (error) {
            console.error('Verification error:', error);
        }
    });

    // Update the send email function to use stored credentials
    async function sendEmails(data) {
        const credentials = getStoredCredentials();
        if (!credentials.email) {
            throw new Error('Email credentials not found');
        }
        
        // Add credentials to request
        // ...existing send email code...
    }

    // Update generate content handler
    document.getElementById('generate-content').addEventListener('click', async function() {
        const credentials = getStoredCredentials();
        const aiProvider = credentials.ai.provider;
        const aiKey = credentials.ai.key;

        if (!aiKey) {
            const addKey = confirm(`AI features require an ${aiProvider} API key. Would you like to add one now?`);
            if (addKey) {
                switchTab('email-config');
                aiKeyInput.focus();
            }
            return;
        }

        const prompt = document.getElementById('ai-prompt').value;
        const data = JSON.parse(localStorage.getItem('previewData') || '[]');
        
        if (!prompt) {
            alert('Please enter a prompt for the AI');
            return;
        }

        if (!data.length) {
            alert('Please upload data first to use available fields');
            return;
        }

        try {
            this.disabled = true;
            this.textContent = 'Generating...';
            
            const response = await fetch('http://localhost:3001/generate-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${aiKey}`
                },
                body: JSON.stringify({
                    provider: aiProvider,
                    prompt: prompt,
                    availableFields: Object.keys(data[0] || {})
                })
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to generate content');
            }

            if (result.success && result.content) {
                // Switch to manual mode to show the generated content
                document.getElementById('body-type').value = 'manual';
                document.querySelector('.ai-section').style.display = 'none';
                document.querySelector('.manual-section').style.display = 'block';
                
                // Set the generated content
                document.getElementById('email-body').value = result.content;
                
                // Show success notification
                const successMessage = document.createElement('div');
                successMessage.className = 'ai-success-message';
                successMessage.textContent = '✓ AI content generated successfully';
                this.parentNode.appendChild(successMessage);
                setTimeout(() => successMessage.remove(), 3000);
            } else {
                throw new Error('No content received from AI');
            }
        } catch (error) {
            console.error('Content generation error:', error);
            alert('Failed to generate content: ' + error.message);
        } finally {
            this.disabled = false;
            this.textContent = 'Generate Content';
        }
    });

    // ...existing code...
});

// Add at the top after other imports
const socket = io('http://localhost:3001');

socket.on('analytics-update', (analytics) => {
    updateAnalytics(analytics);
});

function updateAnalytics(data) {
    // Update counters
    document.getElementById('total-emails').textContent = data.totalEmails;
    document.getElementById('sent-emails').textContent = data.sent;
    document.getElementById('failed-emails').textContent = data.failed;
    document.getElementById('pending-emails').textContent = data.inProgress;

    // Update progress bar
    const progress = ((data.sent + data.failed) / data.totalEmails) * 100 || 0;
    document.getElementById('send-progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${Math.round(progress)}%`;

    // Update history with timestamps
    const historyList = document.getElementById('email-history-list');
    historyList.innerHTML = data.history.map(item => `
        <div class="history-item">
            <span class="time">${new Date(item.timestamp).toLocaleTimeString()}</span>
            <span class="recipient">${item.recipient}</span>
            <span class="status ${item.status}">
                ${item.status}
                ${item.duration ? ` (${Math.round(item.duration)}ms)` : ''}
                ${item.error ? `<span class="error-message">- ${item.error}</span>` : ''}
            </span>
        </div>
    `).join('');

    // Automatically switch to analytics tab when sending starts
    if (data.inProgress > 0 && !document.getElementById('email-analytics').classList.contains('active')) {
        switchTab('email-analytics');
    }
}

// ...rest of existing code...
