# Let's Play Together (Fork)

A real-time screen sharing application built with Next.js, WebRTC, and PeerJS. Create or join rooms to share your screen with others instantly. Additionally, it supports joystick input, making it possible to play games with others.

> **Note:** This project is a fork of the [original repository](https://github.com/tonghohin/screen-sharing).

## ✨ Features

- Real-time screen and audio sharing
- Room-based sharing system
- Cross-browser support
- Simple and intuitive interface
- Joystick support
- Dynamic bitrate and resolution adjustments based on packet loss or poor client connection
- PWA (Progressive Web App) support
- Video streaming statistics

## 📱 Device Support

- **Hosting**: Desktop/laptop browsers only
- **Viewing**: Works on all devices (desktop, tablet, mobile)

### Important Notes

- For audio sharing to work, users have to select the **tab option** when sharing in **Google Chrome** or **Microsoft Edge**.

## 🛠️ Built With

- [Next.js](https://nextjs.org/) - React framework
- [PeerJS](https://peerjs.com/) - WebRTC abstraction
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [vigembus-websocket](https://github.com/PacificSilent/vigembus-websocket) - Complementary project for joystick support

## 🚀 Getting Started

First, clone the repository:

```bash
git clone https://github.com/PacificSilent/lets-play-together.git
```

Navigate to the project directory:

```bash
cd lets-play-together
```

### Using npm

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

or production:

```bash
npm run build:serve
```

### Using Docker

Start the development container:

```bash
docker compose up
```

## 📦 Deployment

### Cloud Platform

This application can be deployed on any cloud platform that supports static site hosting.

## 👥 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.Screen Sharing Application (Fork)
