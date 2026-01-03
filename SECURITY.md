# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities by opening an issue on our GitHub repository or contacting the maintainers directly.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Security Measures

### API Key Management
- API keys are **never** stored in plain text.
- We use Node.js `crypto` module to encrypt keys at rest.
- Keys are only decrypted in memory when actively required for an API call.

### Local Storage
- All user data, including conversation history and chatbot profiles, is stored locally on your machine in the `data/` directory.
- No data is uploaded to the cloud without your explicit action.

### Content Security Policy (CSP)
- The application uses a strict Content Security Policy to prevent XSS attacks.
- `unsafe-inline` scripts are disabled.
- Integration with external services (like PromptWaffle) runs in isolated contexts where possible.
