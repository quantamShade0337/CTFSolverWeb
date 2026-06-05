plain-English field guide for people learning Capture The Flag challenges. Search by what you see, open a focused playbook, and work through copyable commands, explanations, worked examples, and common mistakes.
FeaturesSearch by symptoms such as binary digits, metadata, JWT, or PCAP
Browse playbooks across eight CTF categories
Follow commands in a practical top-to-bottom order
Copy terminal commands with one click
Learn from worked examples and beginner-friendly explanations
Use responsive layouts on desktop and mobile
DemoWatch the demo video
The demo shows a search for a binary-digits challenge, opening the matching playbook, reviewing its commands, and using the copy action.
Run Locallybash



npm install
npm run dev

Open http://127.0.0.1:5173.
Buildbash



npm run build
npm run preview

Refresh The DemoWith the dev server running:
bash



node scripts/record-demo.mjs
ffmpeg -y -i assets/demo/ctfsolver-demo.webm \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  assets/demo/ctfsolver-demo.mp4

TechReact 19, React Router, Vite, Lucide icons, and Playwright.
