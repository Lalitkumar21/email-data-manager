import pandas as pd
import streamlit as st
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import groq
import time
from typing import Dict, Any
import os
import threading


# Set page configuration
st.set_page_config(
    page_title="Email Data Manager",
    page_icon="📧",
    layout="wide",
    initial_sidebar_state="expanded"
)
if 'smtp_password' not in st.session_state:
    st.session_state.smtp_password = None
if 'email_sent' not in st.session_state:
    st.session_state.email_sent = False
if 'smtp_password' not in st.session_state:
    st.session_state.smtp_password = None
if 'sending_in_progress' not in st.session_state:
    st.session_state.sending_in_progress = False
if 'generated_contents' not in st.session_state:
    st.session_state.generated_contents = {}

if 'failed_emails' not in st.session_state:
    st.session_state.failed_emails = []
if 'pending_emails' not in st.session_state:
    st.session_state.pending_emails = []
if 'scheduled_emails' not in st.session_state:
    st.session_state.scheduled_emails = []

def replace_placeholders(text, row_data):
    result = text
    for key, value in row_data.items():
        placeholder = '{' + key + '}'
        result = result.replace(placeholder, str(value))
    return result

def setup_smtp_connection(domain):
    smtp_configs = {
        'gmail.com': {'smtp_server': 'smtp.gmail.com', 'smtp_port': 587},
        'yahoo.com': {'smtp_server': 'smtp.mail.yahoo.com', 'smtp_port': 587},
        'outlook.com': {'smtp_server': 'smtp.office365.com', 'smtp_port': 587}
    }
    
    config = smtp_configs.get(domain)
    if not config:
        return None, "Unsupported email domain"
    
    try:
        server = smtplib.SMTP(config['smtp_server'], config['smtp_port'])
        server.starttls()
        return server, None
    except Exception as e:
        return None, f"SMTP connection error: {str(e)}"

def file_upload():
    st.markdown("### 📁 Upload Your Data")
    with st.container():
        col1, col2 = st.columns([2, 1])
        with col1:
            uploaded_file = st.file_uploader(
                "Drop your file here or click to upload",
                type=["csv", "xlsx", "xls"],
                help="Supported formats: CSV, Excel (.xlsx, .xls)"
            )
        with col2:
            st.markdown("""
                #### Supported Files
                - CSV files (.csv)
                - Excel files (.xlsx, .xls)
            """)
    
    if uploaded_file is not None:
        file_name = uploaded_file.name
        file_type = file_name.split(".")[-1].lower()
        
        try:
            if file_type in ["csv"]:
                df = pd.read_csv(uploaded_file)
                return df, file_type, file_name
            elif file_type in ["xlsx", "xls"]:
                df = pd.read_excel(uploaded_file)
                return df, file_type, file_name
            
        except Exception as e:
            st.error(f"🚫 Error processing file: {str(e)}")
            return None, None, None

def setup_groq_client():
    os.environ["GROQ_API_KEY"] = "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"

    """Initialize Groq client with API key."""
    api_key = os.getenv("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") 
    return groq.Groq(api_key=api_key)

def generate_custom_content(client: groq.Groq, prompt_template: str, row_data: Dict[Any, Any]) -> str:
    """
    Generate customized content using Groq API based on row data and prompt template.
    """
    try:
        if not client:
            return None

        # Replace placeholders in prompt template with actual data
        formatted_prompt = prompt_template
        for key, value in row_data.items():
            placeholder = '{' + str(key) + '}'  # Convert key to string
            formatted_prompt = formatted_prompt.replace(placeholder, str(value))

        # Add safety check for empty prompt
        if not formatted_prompt.strip():
            return None

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional email content writer. Generate personalized, engaging content while maintaining a professional tone."
                },
                {
                    "role": "user",
                    "content": formatted_prompt
                }
            ],
            model="mixtral-8x7b-32768",
            temperature=0.7,
            max_tokens=1000,
        )
        
        generated_content = chat_completion.choices[0].message.content
        if not generated_content:
            raise ValueError("No content generated")
            
        return generated_content
    except Exception as e:
        st.error(f"Error generating content: {str(e)}")
        return None
    """Generate content for all valid recipients."""
    groq_client = setup_groq_client()
    if not groq_client:
        return False

    generated_contents = {}
    total_rows = len(df)
    progress_bar = st.progress(0)
    progress_text = st.empty()

    for idx, row in df.iterrows():
        progress_text.text(f"Generating content for recipient {idx + 1}/{total_rows}")
        content = generate_custom_content(groq_client, prompt_template, row.to_dict())
        if content:
            generated_contents[row[email_column]] = content
        progress_bar.progress((idx + 1) / total_rows)

    st.session_state.generated_contents = generated_contents
    return True
def bulk_generate_content(df, email_column, prompt_template):
    """Generate content for all valid recipients."""
    groq_client = setup_groq_client()
    if not groq_client:
        st.error("Please provide a valid Groq API key to generate content.")
        return False

    if not prompt_template.strip():
        st.error("Please provide a valid prompt template.")
        return False

    generated_contents = {}
    total_rows = len(df)
    progress_bar = st.progress(0)
    progress_text = st.empty()
    
    try:
        for idx, row in df.iterrows():
            progress_text.text(f"Generating content for recipient {idx + 1}/{total_rows}")
            
            # Add error handling for each row
            try:
                content = generate_custom_content(groq_client, prompt_template, row.to_dict())
                if content:
                    generated_contents[row[email_column]] = content
                else:
                    st.warning(f"No content generated for {row[email_column]}")
            except Exception as row_error:
                st.warning(f"Error generating content for {row[email_column]}: {str(row_error)}")
            
            progress_bar.progress((idx + 1) / total_rows)

        if generated_contents:
            st.session_state.generated_contents = generated_contents
            st.success(f"Successfully generated content for {len(generated_contents)} recipients")
            return True
        else:
            st.error("No content was generated. Please check your prompt template and try again.")
            return False
            
    except Exception as e:
        st.error(f"Error during bulk generation: {str(e)}")
        return False

def preview_generated_content(df, email_column, prompt_template):
    """Generate and preview content for the first few rows."""
    groq_client = setup_groq_client()
    if not groq_client:
        st.error("Please provide a valid Groq API key to generate content.")
        return False

    if not prompt_template.strip():
        st.error("Please provide a valid prompt template.")
        return False

    preview_count = min(3, len(df))
    preview_data = []
    
    with st.spinner(f"Generating preview for {preview_count} emails..."):
        for idx, row in df.head(preview_count).iterrows():
            try:
                content = generate_custom_content(groq_client, prompt_template, row.to_dict())
                if content:
                    preview_data.append({
                        "Recipient": row[email_column],
                        "Generated Content": content
                    })
                else:
                    st.warning(f"No content generated for {row[email_column]}")
            except Exception as e:
                st.warning(f"Error generating preview for {row[email_column]}: {str(e)}")
    
    if preview_data:
        st.write("#### 📋 Content Preview")
        for idx, data in enumerate(preview_data, 1):
            with st.expander(f"Preview {idx}: {data['Recipient']}", expanded=True):
                st.write(data['Generated Content'])
        return True
    else:
        st.error("No preview content was generated. Please check your prompt template and try again.")
        return False

def send_email(from_email, password, to_email, subject_template, body_template, row_data, attachment_df=None):
    """Send email with placeholder replacement and optional DataFrame attachment."""
    try:
        domain = from_email.split('@')[1].lower()
        server, error = setup_smtp_connection(domain)
        if error:
            return False, error
        
        # Replace placeholders in subject and body
        subject = replace_placeholders(subject_template, row_data)
        body = replace_placeholders(body_template, row_data)
        
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        if attachment_df is not None:
            csv_str = attachment_df.to_csv(index=False)
            attachment = MIMEText(csv_str)
            attachment.add_header('Content-Disposition', 'attachment', 
                                filename=f'data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv')
            msg.attach(attachment)
        
        server.login(from_email, password)
        server.send_message(msg)
        server.quit()
        
        return True, "✅ Email sent successfully!"
    except Exception as e:
        return False, f"❌ Failed to send email: {str(e)}"

def Email(df=None):
    st.markdown("### 📧 Email Configuration")
    success = None
    common_esps = {
        'gmail.com': 'Google Gmail',
        'yahoo.com': 'Yahoo Mail',
        'outlook.com': 'Microsoft Outlook',
        'hotmail.com': 'Microsoft Hotmail',
        'aol.com': 'AOL Mail',
        'icloud.com': 'Apple iCloud'
    }

    # Email Input Section
    col1, col2 = st.columns([2, 1])
    with col1:
        from_mail = st.text_input(
            "📧 Your Email Address:", 
            placeholder="Enter your email address to send from",
            label_visibility="visible"
        )
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not from_mail:
        return False

    if not re.match(pattern, from_mail):
        st.error("❌ Invalid email format")
        return False

    domain = from_mail.split('@')[1].lower()
    
    # Handle Custom Domain
    if domain not in common_esps:
        st.warning(f"⚠️ Custom domain detected: {domain}")
        with st.expander("🛠️ Configure Custom SMTP Settings"):
            smtp_server = st.text_input("SMTP Server:", value=f"smtp.{domain}")
            smtp_port = st.number_input("SMTP Port:", value=587)
        return False

    # Valid ESP Configuration
    st.success(f"✅ Valid email from {common_esps[domain]}")
    
    # Create Tabs for Authentication and Email Sending
    auth_tab, send_tab = st.tabs(["🔐 Authentication", "📤 Send Email"])
    
    # Authentication Tab
    with auth_tab:
        # App Password Instructions
        if domain in ['gmail.com', 'outlook.com']:
            st.info("🔒 Enhanced Security: Please use App Password")
            with st.expander("How to generate App Password"):
                st.markdown("""
                1. Go to your account security settings
                2. Enable 2-Step Verification if not already enabled
                3. Generate an App Password
                4. Use the generated password below
                """)

        # Password Input
        password = st.text_input("🔑 Password or App Password:", type="password")
        if password:
            st.session_state.smtp_password = password
            
            # Test Connection Button
            if st.button("🔄 Test Connection"):
                with st.spinner("Testing connection..."):
                    server, error = setup_smtp_connection(domain)
                    if error:
                        st.error(f"❌ Connection failed: {error}")
                    else:
                        try:
                            server.login(from_mail, password)
                            st.success("✅ Connection successful!")
                            success = True
                            server.quit()
                        except Exception as e:
                            st.error(f"❌ Login failed: Incorrect Username or Password")

    # Send Email Tab
    with send_tab:
        if not (success == True or st.session_state.smtp_password):
            st.warning("Please fill the App Password for Authentication first!!")
            return True

        if df is None:
            st.warning("Please upload a data file first!")
            return True

        # Display Available Placeholders
        st.info("Available Placeholders:")
        placeholder_list = [f"{{{col}}}" for col in df.columns]
        st.code(", ".join(placeholder_list))
        
        # Email Column Selection
        email_cols = [col for col in df.columns if 'email' in col.lower() or 'mail' in col.lower()]
        default_email_col = email_cols[0] if email_cols else df.columns[0]
        
        email_column = st.selectbox(
            "Select Email Column",
            options=df.columns,
            index=df.columns.get_loc(default_email_col),
            help="Select the column containing recipient email addresses"
        )
        
        # Validate Email Addresses
        invalid_emails = df[~df[email_column].str.match(pattern, na=False)]
        if not invalid_emails.empty:
            st.warning(f"⚠️ Found {len(invalid_emails)} invalid email(s) in the selected column. These rows will be skipped.")
            with st.expander("View Invalid Emails"):
                st.dataframe(invalid_emails)

        # Content Generation Section
        st.markdown("### 📝 Content Generation")
        content_generation_method = st.radio(
            "Choose content generation method:",
            ["Use Template with Placeholders", "Generate Custom Content with AI"],
            help="Select how you want to generate email content"
        )

        # AI Content Generation
        if content_generation_method == "Generate Custom Content with AI":
            st.markdown("#### 🤖 AI Content Generation")
            
            # Groq API Setup
            groq_client = setup_groq_client()
            if not groq_client:
                st.warning("Please enter your Groq API key to use AI content generation.")
                return True

            # Prompt Template Input
            prompt_template = st.text_area(
                "Enter your prompt template:",
                placeholder="Write a personalized email to {Name} about their recent purchase of {Product}...",
                help="Use placeholders like {ColumnName} that match your data columns"
            )

            # Preview and Generate Buttons
            col1, col2 = st.columns([1, 1])
            with col1:
                if st.button("🔍 Preview Generated Content"):
                    preview_generated_content(df, email_column, prompt_template)
            with col2:
                if st.button("🔄 Generate All Content"):
                    bulk_generate_content(df, email_column, prompt_template)

        # Email Composition Form
        with st.form(key="email_form"):
            st.markdown("#### 📧 Compose Email")
            
            # Subject Input
            subject = st.text_input(
                "Subject:",
                placeholder="Enter subject (you can use placeholders like {Company})"
            )
            
            # Body Input (based on generation method)
            if content_generation_method == "Use Template with Placeholders":
                body = st.text_area(
                    "Message Template:",
                    height=150,
                    placeholder="Type your message template (you can use placeholders like {Company})"
                )
            else:
                st.info("Content will be generated using AI for each recipient")
                body = None
            
            # Preview Section
            if df is not None and len(df) > 0:
                with st.expander("Preview with first row data"):
                    first_row = df.iloc[0].to_dict()
                    st.write("Subject preview:", 
                           replace_placeholders(subject, first_row))
                    if body:
                        st.write("Body preview:", 
                               replace_placeholders(body, first_row))
                    else:
                        preview_content = st.session_state.generated_contents.get(
                            first_row[email_column],
                            "Content will be generated when sending"
                        )
                        st.write("AI-Generated content preview:", preview_content)
                    st.write("Will be sent to:", first_row[email_column])
            
            # Submit Button
            submit_button = st.form_submit_button(
                "📤 Send Email",
                on_click=lambda: setattr(st.session_state, 'sending_in_progress', True)
            )
            
               
                
        # Handle Email Sending
        if submit_button and not st.session_state.email_sent:
            if not subject or (content_generation_method == "Use Template with Placeholders" and not body):
                st.error("❌ Please fill in all required fields")
                st.session_state.sending_in_progress = False
                return True

            with st.spinner("Sending emails..."):
                if df is not None and len(df) > 0:
                    success_count = 0
                    failed_emails = []
                    valid_df = df[df[email_column].str.match(pattern, na=False)]
                    total_valid = len(valid_df)
                    pending_emails = list(df[email_column])
                    progress_bar = st.progress(0)
                    
                    for idx, row in valid_df.iterrows():
                        try:
                            recipient_email = row[email_column]
                            
                            # Get email content based on generation method
                            if content_generation_method == "Generate Custom Content with AI":
                                email_body = st.session_state.generated_contents.get(
                                    recipient_email,
                                    generate_custom_content(
                                        groq_client,
                                        prompt_template,
                                        row.to_dict()
                                    )
                                )
                            else:
                                email_body = replace_placeholders(body, row.to_dict())

                            # Send email
                            success = send_email(
                                from_mail,
                                st.session_state.smtp_password,
                                recipient_email,
                                replace_placeholders(subject, row.to_dict()),
                                email_body,
                                row.to_dict(),
                            )
                            
                            
                        except Exception as e:
                            st.write("Error occured: ",e)
                        
                        progress_bar.progress((idx + 1) / total_valid)

                    # Display results
                    if success_count == total_valid:
                        st.success(f"✅ Successfully sent {success_count} emails!")
                    else:
                        st.warning(f"⚠️ Sent {success_count} out of {total_valid} emails")
                        if failed_emails:
                            with st.expander("View Failed Emails"):
                                for email, error in failed_emails:
                                    st.error(f"{email}: {error}")
                    if hasattr(st.session_state, 'analytics'):
                            st.session_state.analytics.update_metrics(
                                success_count=success_count,
                                failed_emails=failed_emails,
                                pending_emails=pending_emails,
                                scheduled_emails=st.session_state.scheduled_emails
                            )
                    
                    
                    # Reset states
                    st.session_state.sending_in_progress = False
                    st.session_state.email_sent = True
                    st.session_state.generated_contents = {}
    
    return True
def main():
    st.title("📧 Email Data Manager")
    st.markdown("---")
    
    upload_result = file_upload()
    
    
     
    if upload_result:
        df, file_type, file_name = upload_result
        
        if df is not None:
            st.success(f"✅ File uploaded successfully: {file_name}")
            
            st.markdown("### 📊 Data Preview")
            with st.expander("View Data Summary", expanded=True):
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Rows", df.shape[0])
                with col2:
                    st.metric("Columns", df.shape[1])
                with col3:
                    st.metric("File Type", file_type.upper())
                with col4:
                    st.metric("Size", f"{df.memory_usage().sum() / 1024:.1f} KB")
                
                st.dataframe(
                    df.head(),
                    use_container_width=True,
                    height=200
                )
            
            st.markdown("---")
            Email(df)
if __name__ == "__main__":
    main()