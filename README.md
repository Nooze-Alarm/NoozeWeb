# NoozeWeb - HTML & Tailwind CSS Website

A modern, feature-rich website for Nooze Alarm app, built with HTML and Tailwind CSS.

## Features

- 🎨 **Professional Design**: Dark theme with blue accents (#00bcd4)
- 📱 **Fully Responsive**: Works perfectly on all devices
- ⚡ **Fast & Lightweight**: Pure HTML/CSS/JS, no build process needed
- 🎯 **Clean Code**: Well-organized HTML structure
- ✨ **Smooth Animations**: Beautiful fade-in and scroll animations
- 🔔 **Interactive Elements**: Modal, accordion, form validation

## Getting Started

Simply open `index.html` in your browser or use any static file server.

### Using a Local Server

You can use Python's built-in server:
```bash
python -m http.server 8000
```

Or use Node.js http-server:
```bash
npx http-server
```

Then open `http://localhost:8000` in your browser.

## 🚀 Deployment (Static Website)

This is a **static website** - perfect for free hosting! No build step required.

### Quick Deploy Options:

#### **Netlify** (Recommended - Easiest)
1. Go to [netlify.com](https://www.netlify.com) and sign up (free)
2. Drag and drop your entire project folder
3. Your site is live instantly with HTTPS!
4. Optional: Connect GitHub for automatic deployments

#### **GitHub Pages** (Free)
1. Create a new repository on GitHub
2. Upload all files to the repository
3. Go to Settings → Pages
4. Select your branch and `/` (root) folder
5. Your site will be live at `https://yourusername.github.io/repository-name/`

#### **Vercel** (Free)
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Import Project"
3. Upload your folder or connect GitHub
4. Deploy with one click - includes HTTPS and CDN

#### **Cloudflare Pages** (Free)
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your Git repository or upload files
3. Deploy instantly with global CDN

#### **GoDaddy** (Paid Hosting)
1. Log in to your GoDaddy account
2. Go to **My Products** → **Web Hosting** → **Manage**
3. Open **File Manager** (or use FTP client like FileZilla)
4. Navigate to `public_html` folder (or `htdocs` on some plans)
5. Upload all your files to this folder
6. Make sure `index.html` is in the root of `public_html`
7. Your site will be live at your domain name

**FTP Alternative:**
- Use FTP client (FileZilla, WinSCP, etc.)
- Host: `ftp.yourdomain.com` (or IP from GoDaddy)
- Username/Password: From GoDaddy hosting dashboard
- Upload files to `public_html` folder

### Files to Upload:
- ✅ `index.html`
- ✅ `features.html`
- ✅ `about.html`
- ✅ `faq.html`
- ✅ `contact.html`
- ✅ `script.js`
- ✅ `logo.png`
- ✅ `nooze.png`
- ✅ `snimka.jpg`
- ⚠️ `package.json` - Not needed (only used for local dev)
- ⚠️ `README.md` - Optional

**Note:** Since we're using Tailwind CSS via CDN, no build process is required!

## Project Structure

```
NoozeWeb/
├── index.html          # Home page
├── features.html       # Features page
├── about.html          # About page
├── faq.html           # FAQ page
├── contact.html       # Contact page
├── script.js          # JavaScript for interactivity
├── logo.png           # Logo image
├── nooze.png          # App dashboard preview
├── snimka.jpg         # Developer photo
└── README.md          # This file
```

## Pages

- **Home**: Hero section, features preview, problem/solution, use cases, how it works, development roadmap, benefits, science behind, comparison table, trust signals, CTA
- **Features**: Comprehensive feature list with detailed descriptions (16 features including gamification, social platform, journal, and sleep aid)
- **About**: Mission, story of how Nooze was born, developer information, and company values
- **FAQ**: Accordion-style FAQ with common questions
- **Contact**: Contact form with validation, contact information, privacy policy, and terms of service

## Technologies

- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first CSS framework (via CDN)
- **Vanilla JavaScript**: No frameworks, pure JS for interactivity

## Customization

### Colors

The color scheme is defined in each HTML file's Tailwind config:

```javascript
colors: {
  primary: {
    DEFAULT: '#00bcd4',  // Main blue
    dark: '#0097a7',     // Darker blue
    light: '#2196f3',    // Lighter blue
  },
  dark: {
    DEFAULT: '#121212',  // Main dark
    lighter: '#181818',  // Lighter dark
    card: '#252525',     // Card background
    nav: '#1f1f1f',      // Navbar background
  }
}
```

### Adding New Pages

1. Create a new HTML file
2. Copy the navbar and footer structure from an existing page
3. Update navigation links
4. Add your content using Tailwind CSS classes

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

See LICENSE file for details.
