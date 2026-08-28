import { Ios, Android, Windows, Web } from "../components/PlatformIcons.jsx";

export const features = [
  {
    id: "0",
    icon: "/images/feature-1.png",
    caption: "Free Minecraft Hosting",
    title: "Start your server without the cost",
    text: "With BreezeBytes, get your free Minecraft server running in minutes. Reliable resources, instant setup, and zero hidden fees so you can focus on playing with your community.",
    button: {
      icon: "/images/magictouch.svg",
      title: "Get Started Free",
    },
  },
  {
    id: "1",
    icon: "/images/feature-2.png",
    caption: "Easy Server Management",
    title: "Full control at your fingertips",
    text: "Manage your server easily from an intuitive control panel. Access your console, manage files, configure server settings, and keep backups without unnecessary complexity.",
    button: {
      icon: "/images/docs.svg",
      title: "View Features",
    },
  },
];

export const details = [
  {
    id: "0",
    icon: "/images/detail-1.png",
    title: "Instant Server Setup",
  },
  {
    id: "1",
    icon: "/images/detail-2.png",
    title: "Full File Management",
  },
  {
    id: "2",
    icon: "/images/detail-3.png",
    title: "Live Server Console",
  },
  {
    id: "3",
    icon: "/images/detail-4.png",
    title: "Automated Backups",
  },
];

export const faq = [
  {
    id: "0",
    question: "Is BreezeBytes really free?",
    answer:
      "Yes, BreezeBytes provides completely free Minecraft server hosting. You can launch and run your Minecraft server without entering any credit card or billing details.",
  },
  {
    id: "1",
    question: "How do I create a Minecraft server?",
    answer:
      "Creating a server takes less than a minute: sign up for an account, choose your Minecraft version and settings from the control panel, and click launch to get your server IP and start playing.",
  },
  {
    id: "2",
    question: "What Minecraft versions and server software are supported?",
    answer:
      "BreezeBytes supports popular Minecraft software including Paper, Purpur, Vanilla, Fabric, and Spigot across modern and legacy Minecraft versions.",
  },
  {
    id: "3",
    question: "Can I install plugins and mods?",
    answer:
      "Yes! You have full access to install custom plugins on Paper, Purpur, and Spigot servers, as well as lightweight mods on supported modded engines.",
  },
  {
    id: "4",
    question: "Can I access and manage my server files?",
    answer:
      "Yes, BreezeBytes provides a built-in web file manager where you can upload, edit, and manage your world files, server configs, and plugins directly.",
  },
  {
    id: "5",
    question: "How much RAM and storage does the free server have?",
    answer:
      "BreezeBytes free server plans offer from 4 GB up to 16 GB of RAM, 100% to 400% CPU thread allocations, and 10 GB to 30 GB of high-speed NVMe storage.",
  },
  {
    id: "6",
    question: "Do I need a credit card to sign up?",
    answer:
      "No. BreezeBytes is 100% free to start. We will never ask for your credit card or payment information to create a free server.",
  },
  {
    id: "7",
    question: "Is my server always online?",
    answer:
      "Your server stays online while you and your community are playing. Inactive servers can be instantly restarted anytime with one click from your control panel.",
  },
  {
    id: "8",
    question: "Can Java and Bedrock players play together?",
    answer:
      "Yes! By installing cross-play compatibility plugins like GeyserMC and Floodgate, players on PC, console, and mobile can join the same server.",
  },
  {
    id: "9",
    question: "How do I invite friends to join my server?",
    answer:
      "Once your server is started, copy your unique server address from the panel and share it with your friends to connect directly in their Minecraft client.",
  },
];

export const plans = [
  {
    id: "0",
    title: "Starter SMP",
    priceMonthly: 0,
    priceYearly: 0,
    caption: "Best for friends & solo SMPs",
    features: [
      "4 GB RAM Allocation",
      "100% CPU Thread",
      "10 GB NVMe Storage",
      "Full Web Console Access",
    ],
    icon: "/images/circle.svg",
    logo: "/images/plan-1.png",
  },
  {
    id: "1",
    title: "Community Free",
    priceMonthly: 0,
    priceYearly: 0,
    caption: "Most popular for active servers",
    features: [
      "16 GB RAM Allocation",
      "400% Dedicated CPU",
      "30 GB NVMe Storage",
      "File Manager & Backups",
      "Plugin & Mod Support",
      "Instant Server Deployment",
    ],
    icon: "/images/triangle.svg",
    logo: "/images/plan-2.png",
  },
  {
    id: "2",
    title: "Custom Server",
    priceMonthly: 0,
    priceYearly: 0,
    caption: "Configured for custom setups",
    features: [
      "8 GB RAM Allocation",
      "200% CPU Allocation",
      "20 GB NVMe Storage",
      "DDoS Protection Included",
    ],
    icon: "/images/hexagon.svg",
    logo: "/images/plan-3.png",
  },
];

export const testimonials = [
  {
    id: "0",
    name: "Alex M.",
    role: "SMP Server Host",
    avatarUrl: "/images/testimonials/jessica-saunders.png",
    comment:
      "BreezeBytes made setting up an SMP for our friend group seamless. The server started up in seconds with zero hassle.",
  },
  {
    id: "1",
    name: "Liam K.",
    role: "Minecraft Creator",
    avatarUrl: "/images/testimonials/mark-erixon.png",
    comment:
      "Having 4 GB RAM and full console access on a free tier is fantastic. The control panel is super clean and fast.",
  },
  {
    id: "2",
    name: "Sarah T.",
    role: "Community Builder",
    avatarUrl: "/images/testimonials/melanie-hurst.png",
    comment:
      "We hosted our community survival world on BreezeBytes. File management and installing plugins was completely painless.",
  },
  {
    id: "3",
    name: "Ethan R.",
    role: "Plugin Developer",
    avatarUrl: "/images/testimonials/alicia-barker.png",
    comment:
      "The Paper server support and live log streaming make testing plugins fast and reliable. Highly recommended.",
  },
  {
    id: "4",
    name: "Marcus D.",
    role: "Vanilla SMP Host",
    avatarUrl: "/images/testimonials/becky-snider.png",
    comment:
      "Finally a free hosting provider that doesn't bombard you with impossible queues or hidden fees. It just works.",
  },
  {
    id: "5",
    name: "Chloe W.",
    role: "Gaming Group Admin",
    avatarUrl: "/images/testimonials/jim-bradley.png",
    comment:
      "Setting up Geyser for cross-play with our Bedrock friends took under 5 minutes. BreezeBytes is incredible.",
  },
];

export const logos = [
  {
    id: "0",
    title: "PaperMC",
    url: "/images/logos/afterpay.svg",
    width: 156,
    height: 48,
  },
  {
    id: "1",
    title: "Purpur",
    url: "/images/logos/amplitude.svg",
    width: 194,
    height: 48,
  },
  {
    id: "2",
    title: "Fabric",
    url: "/images/logos/sonos.svg",
    width: 115,
    height: 48,
  },
  {
    id: "3",
    title: "Spigot",
    url: "/images/logos/maze.svg",
    width: 142,
    height: 48,
  },
  {
    id: "4",
    title: "Geyser",
    url: "/images/logos/drips.svg",
    width: 77,
    height: 48,
  },
];

export const links = [
  {
    id: "0",
    title: "Java Edition",
    icon: <Ios />,
    url: "#hero",
  },
  {
    id: "1",
    title: "Bedrock Edition",
    icon: <Android />,
    url: "#hero",
  },
  {
    id: "2",
    title: "Desktop Client",
    icon: <Windows />,
    url: "#hero",
  },
  {
    id: "3",
    title: "Web Panel",
    icon: <Web />,
    url: "#hero",
  },
];

export const socials = [
  {
    id: "0",
    title: "Discord",
    icon: "/images/socials/discord.svg",
    url: "https://discord.gg",
  },
  {
    id: "1",
    title: "x",
    icon: "/images/socials/x.svg",
    url: "https://x.com",
  },
  {
    id: "2",
    title: "Threads",
    icon: "/images/socials/threads.svg",
    url: "https://threads.net",
  },
  {
    id: "3",
    title: "Instagram",
    icon: "/images/socials/instagram.svg",
    url: "https://instagram.com",
  },
];
