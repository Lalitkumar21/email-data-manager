# Email Upload Project

This project is an Email Data Manager that allows users to upload Excel files for processing. It consists of a frontend interface and a backend server to handle file uploads.

## Project Structure

```
email-upload-project
├── backend
│   ├── controllers
│   │   └── uploadController.js
│   ├── routes
│   │   └── uploadRoutes.js
│   ├── app.js
│   └── package.json
├── frontend
│   ├── css
│   │   └── styles.css
│   ├── js
│   │   └── scripts.js
│   ├── email_UI.html
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd email-upload-project
   ```

2. Navigate to the backend directory and install dependencies:
   ```
   cd backend
   npm install
   ```

3. Navigate to the frontend directory (if needed) and install any frontend dependencies:
   ```
   cd frontend
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   node app.js
   ```

2. Open `frontend/email_UI.html` in your web browser to access the Email Data Manager interface.

### Usage

- Use the upload section in the UI to select and upload your Excel files.
- The backend will process the uploaded files and handle them accordingly.

## Free AI Options

This section provides information about free AI services that can be integrated into the Email Data Manager project:

1. **OpenAI GPT-3 Playground**: A free tier is available for experimenting with AI text generation.
   - [OpenAI GPT-3](https://beta.openai.com/)

2. **Hugging Face Transformers**: Offers a variety of pre-trained models for natural language processing tasks.
   - [Hugging Face](https://huggingface.co/)

3. **Google Cloud AI**: Provides a free tier for various AI services, including natural language processing and machine learning.
   - [Google Cloud AI](https://cloud.google.com/products/ai)

4. **IBM Watson**: Offers a free tier for various AI services, including language processing and visual recognition.
   - [IBM Watson](https://www.ibm.com/watson)

5. **Microsoft Azure AI**: Provides a free tier for various AI services, including machine learning and cognitive services.
   - [Microsoft Azure AI](https://azure.microsoft.com/en-us/services/cognitive-services/)

Feel free to explore these options and integrate them into the project as needed.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes. 

## License

This project is licensed under the MIT License.
