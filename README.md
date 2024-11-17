
https://github.com/user-attachments/assets/56cecd58-b3c1-46c5-91e6-879ae8834129
# 📧 Email Data Manager

A powerful Streamlit application for managing email campaigns with AI-generated content and SMTP integration. Streamline your email communications with automated content generation and efficient bulk sending capabilities.

## ✨ Features

- 📁 **Data Management**
  - Upload CSV/Excel files containing email data
  - Preview and validate data before processing
  - Automatic email format validation

- 📧 **Email Composition**
  - Dynamic templates with placeholder support
  - AI-powered content generation using Groq API
  - Preview generation before sending
  - Support for personalized content

- 🔒 **SMTP Integration**
  - Support for major email providers (Gmail, Outlook, Yahoo)
  - Secure authentication with app passwords
  - Connection testing functionality
  - Custom SMTP server configuration

- 📤 **Bulk Operations**
  - Send emails to multiple recipients
  - Progress tracking
  - Error handling and reporting
  - Failed email retry capability

- 📊 **Analytics & Reporting**
  - Real-time sending statistics
  - Success/failure tracking
  - Detailed error reporting
  - Email status monitoring

## 🚀 Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/email-data-manager.git
   cd email-data-manager
   ```

2. **Set Up Virtual Environment**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**
   ```bash
   # Create .env file
   touch .env

   # Add your Groq API key
   GROQ_API_KEY=your_api_key_here
   ```

5. **Run the Application**
   ```bash
   python3 -m streamlit run main.py
   ```

## 💻 Usage

### 1. Data Upload
- Click "Upload Your Data" button
- Select CSV or Excel file containing email data
- Review data preview and summary statistics

### 2. Email Configuration
1. Enter your email address
2. Select authentication method:
   - Use app password (recommended for Gmail/Outlook)
   - Regular password for other providers
3. Test SMTP connection

### 3. Content Generation
Choose between:
- **Template Mode**
  - Use placeholders like `{Name}`, `{Company}`
  - Preview with actual data
- **AI Generation**
  - Enter prompt template
  - Preview generated content
  - Bulk generate for all recipients

### 4. Sending Emails
1. Configure subject and body
2. Preview email for first recipient
3. Click "Send Email" to start campaign
4. Monitor progress and results

## 🔧 Configuration

### Supported Email Providers
- Gmail (`smtp.gmail.com`)
- Outlook (`smtp.office365.com`)
- Yahoo (`smtp.mail.yahoo.com`)
- Custom SMTP servers

### Required Data Format
```csv
Name,Email,Company
John Doe,john@example.com,ABC Corp
Jane Smith,jane@example.com,XYZ Inc
```
##🎥 Full Video Tutorial
Watch the full tutorial on how to use the Email Data Manager:



https://github.com/user-attachments/assets/679fb2a5-7210-4eec-b2ae-1bf8b72f3d21


## 🤝 Contributing

1. Fork the repository
2. Create feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- [Streamlit](https://streamlit.io/)
- [Groq API](https://groq.com/)
- [Python Email Library](https://docs.python.org/3/library/email.html)
