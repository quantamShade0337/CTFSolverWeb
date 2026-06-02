const sh = (lines) => lines.join("\n");

const recipes = {
  file: {
    commands: [
      "file <target>",
      "xxd -l 128 <target>",
      "strings -a <target> | grep -Ei 'flag\\{|picoCTF\\{|ctf\\{|password|secret|hint'",
      "exiftool <target>",
      "binwalk <target>",
    ],
    thought: [
      "Start by proving the real file type. Challenge filenames lie constantly.",
      "Check magic bytes, readable strings, metadata, and embedded offsets before trying exotic tools.",
      "If a tool identifies another file inside, extract it and restart triage on the extracted artifact.",
    ],
  },
  archive: {
    commands: [
      "file <archive>",
      "7z l <archive> || unzip -l <archive> || tar tf <archive>",
      "zipinfo -v <archive> 2>/dev/null | head -80",
      "7z x <archive> -oout",
      "find out -type f -exec file {} \\;",
      "grep -RaiE 'flag\\{|picoCTF\\{|password|hint' out",
    ],
    thought: [
      "List before extracting so you notice comments, odd paths, nested files, or dangerous names.",
      "Extract into a clean folder, then recurse into every new artifact.",
      "If encrypted, search challenge text, filenames, comments, and metadata for the password before cracking.",
    ],
  },
  image: {
    commands: [
      "file image",
      "exiftool image",
      "binwalk image",
      "strings -a image | grep -Ei 'flag\\{|picoCTF\\{|ctf\\{|password|secret'",
      "magick identify -verbose image | head -120",
      "zsteg image 2>/dev/null || true",
    ],
    thought: [
      "Images can hide text in metadata, appended data, color channels, bit planes, alpha, palette order, or visual content.",
      "Use metadata and embedded-data checks first, then move to pixel-level tools.",
      "If the flag is rendered visually, OCR or simply opening the generated/extracted image may be required.",
    ],
  },
  audio: {
    commands: [
      "file audio",
      "exiftool audio",
      "strings -a audio | grep -Ei 'flag\\{|picoCTF\\{'",
      "sox audio -n spectrogram -o spectrogram.png",
      "open spectrogram.png",
      "ffmpeg -i audio -af areverse reversed.wav",
    ],
    thought: [
      "Audio CTFs often hide data visually in the spectrogram or audibly through Morse/DTMF/SSTV.",
      "Generate a spectrogram, inspect metadata, and try reversal or speed changes if the sound is unnatural.",
    ],
  },
  video: {
    commands: [
      "file video",
      "exiftool video",
      "ffprobe video",
      "mkdir -p frames && ffmpeg -i video frames/frame_%05d.png",
      "find frames -type f -exec zbarimg {} \\; 2>/dev/null | head",
      "strings -a video | grep -Ei 'flag\\{|picoCTF\\{'",
    ],
    thought: [
      "Extract frames because a one-frame QR or flag can be impossible to catch during playback.",
      "Check subtitles, metadata, audio streams, and frame-by-frame visual clues.",
    ],
  },
  disk: {
    commands: [
      "file disk.img",
      "mmls disk.img",
      "fls -r -o <sector_offset> disk.img | head -120",
      "icat -o <sector_offset> disk.img <inode> > recovered.bin",
      "strings -a disk.img | grep -Ei 'flag\\{|picoCTF\\{|password|secret'",
      "binwalk disk.img",
    ],
    thought: [
      "Find partitions, determine filesystem type, list live and deleted files, then carve unallocated space.",
      "Offsets matter. SleuthKit partition offsets are usually sectors, not bytes.",
    ],
  },
  memory: {
    commands: [
      "volatility3 -f memory.raw windows.info || volatility3 -f memory.raw linux.banners",
      "volatility3 -f memory.raw windows.pslist",
      "volatility3 -f memory.raw windows.cmdline",
      "volatility3 -f memory.raw windows.netscan",
      "strings -a memory.raw | grep -Ei 'flag\\{|picoCTF\\{|password|secret|cmd.exe|powershell'",
    ],
    thought: [
      "Identify OS/profile, then inspect processes, command lines, network connections, handles, clipboard, and dumped process memory.",
      "If a challenge mentions browser, shell, malware, or password, pivot to the matching Volatility plugin.",
    ],
  },
  pcap: {
    commands: [
      "file capture.pcap",
      "tshark -r capture.pcap -q -z io,phs",
      "tshark -r capture.pcap -Y 'http || dns || ftp || smtp || websocket || icmp' | head -80",
      "tcpflow -r capture.pcap",
      "strings -a capture.pcap | grep -Ei 'flag\\{|picoCTF\\{|USER|PASS|Authorization|Cookie'",
    ],
    thought: [
      "Protocol summary tells you where to look. Then follow streams, carve files, and decode protocol-specific payloads.",
      "Flags often live in HTTP bodies, cookies, DNS labels, ICMP payloads, FTP/SMTP transfers, or reconstructed files.",
    ],
  },
  web: {
    commands: [
      "curl -i http://host/",
      "curl -i http://host/robots.txt",
      "curl -i http://host/.env",
      "curl -i http://host/.git/HEAD",
      "ffuf -u http://host/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt",
    ],
    thought: [
      "Map the app first: routes, parameters, cookies, source, headers, and hidden files.",
      "Then test the bug class suggested by the parameter or framework: SQLi, LFI, SSTI, SSRF, upload, auth, or deserialization.",
    ],
  },
  injection: {
    commands: [
      "curl -i 'http://host/path?x=test'",
      "curl -i \"http://host/path?x='\"",
      "curl -i 'http://host/path?x={{7*7}}'",
      "curl -i 'http://host/path?x=../../../../etc/passwd'",
      "curl -i 'http://host/path?x=127.0.0.1;id'",
    ],
    thought: [
      "Inject tiny harmless probes first and compare status, length, errors, and reflected output.",
      "A different response tells you which interpreter is behind the parameter.",
    ],
  },
  crypto: {
    commands: [
      "file crypto.txt",
      "cat crypto.txt",
      "python3 - <<'PY'\nfrom pathlib import Path\ns=Path('crypto.txt').read_text().strip()\nprint('len', len(s), 'unique', len(set(s)))\nprint(s[:120])\nPY",
      "cyberchef  # try From Base64, From Hex, ROT, XOR, Magic",
    ],
    thought: [
      "Identify representation first: encoding, classical cipher, XOR, block cipher, RSA, PRNG, or hash.",
      "Look for structural clues: alphabet, length, repeated blocks, given variables, reused nonces, or known plaintext.",
    ],
  },
  rsa: {
    commands: [
      "cat rsa.txt",
      "python3 - <<'PY'\nimport math,re\ns=open('rsa.txt').read()\nvals={k:int(v,0) for k,v in re.findall(r'\\b(n|e|c|p|q|phi|d|dp|dq)\\s*[=:]\\s*(0x[0-9a-fA-F]+|\\d+)',s)}\nprint(vals.keys())\nif {'p','q','e','c'} <= vals.keys():\n n=vals.get('n', vals['p']*vals['q']); phi=(vals['p']-1)*(vals['q']-1); d=pow(vals['e'],-1,phi); m=pow(vals['c'],d,n); print(m.to_bytes((m.bit_length()+7)//8,'big'))\nPY",
      "RsaCtfTool.py --publickey key.pem --uncipherfile cipher.bin",
    ],
    thought: [
      "RSA challenges are usually about bad parameters: leaked factors, small e, shared primes, close primes, reused message, or partial private key.",
      "Parse all numbers, then choose the attack from what is leaked.",
    ],
  },
  block: {
    commands: [
      "python3 - <<'PY'\ndata=open('cipher.bin','rb').read(); blocks=[data[i:i+16] for i in range(0,len(data),16)]; print('repeated blocks', len(blocks)-len(set(blocks)))\nPY",
      "xxd cipher.bin | head",
      "python3 exploit_oracle.py  # if server reveals padding validity",
    ],
    thought: [
      "Check mode clues: ECB repeats blocks, CBC can be bitflipped or padding-oracled, CTR/GCM breaks under nonce reuse.",
      "If there is an oracle endpoint, compare error classes carefully.",
    ],
  },
  pwn: {
    commands: [
      "file ./chall",
      "checksec --file ./chall",
      "strings -a ./chall | grep -Ei 'flag|win|shell|system|/bin/sh|gets|printf'",
      "nm -an ./chall 2>/dev/null | grep -Ei 'win|flag|main|system'",
      "python3 - <<'PY'\nfrom pwn import *\nelf=ELF('./chall')\nprint(elf.checksec())\nprint(cyclic(200))\nPY",
    ],
    thought: [
      "Determine protections and bug class before writing payloads.",
      "Easy pwn usually means ret2win, format string, ret2libc, or unsafe path/env handling.",
    ],
  },
  rev: {
    commands: [
      "file ./chall",
      "strings -a ./chall | grep -Ei 'flag|pass|correct|wrong|key|license|decrypt|xor'",
      "ltrace ./chall 2>/dev/null || true",
      "objdump -d ./chall | less",
      "ghidraRun  # inspect validation and decode routines",
    ],
    thought: [
      "Start with strings and dynamic traces, then decompile validation logic.",
      "If the binary compares input, either recover the expected string, patch the branch, or reimplement the checker.",
    ],
  },
  mobile: {
    commands: [
      "file app.apk",
      "unzip -l app.apk | head",
      "apktool d app.apk -o apkout",
      "jadx-gui app.apk",
      "grep -RniE 'flag|picoCTF|secret|password|firebase|api' apkout",
    ],
    thought: [
      "Mobile apps are containers with resources, config, bytecode, native libraries, and local databases.",
      "Search everything first, then inspect code paths that validate flags or load secrets.",
    ],
  },
  email: {
    commands: [
      "file message.eml",
      "munpack message.eml || ripmime -i message.eml -d extracted",
      "grep -niE 'flag\\{|picoCTF\\{|Received:|DKIM|SPF|From:|Reply-To:' message.eml",
      "python3 - <<'PY'\nfrom email import policy\nfrom email.parser import BytesParser\nmsg=BytesParser(policy=policy.default).parse(open('message.eml','rb'))\nprint(msg['subject'], msg['from'])\nPY",
    ],
    thought: [
      "Inspect headers for spoofing and routing, then decode MIME parts and attachments.",
      "Quoted-printable/base64 bodies often hide the actual clue.",
    ],
  },
  logs: {
    commands: [
      "head -50 log.txt",
      "grep -Ei 'flag\\{|picoCTF\\{|failed|accepted|sudo|union|select|passwd|\\.\\./|cmd=|powershell|curl|wget|upload|admin' log.txt",
      "awk '{print $1}' log.txt | sort | uniq -c | sort -nr | head",
      "python3 - <<'PY'\nfrom collections import Counter\nprint(Counter(open('log.txt',errors='ignore').read().split()).most_common(30))\nPY",
    ],
    thought: [
      "Summarize frequency first, then isolate rare successful events after many failures.",
      "Build a timeline: initial access, privilege change, command execution, exfiltration, flag access.",
    ],
  },
  git: {
    commands: [
      "git status",
      "git log --oneline --all --decorate --graph",
      "git grep -n 'flag\\|picoCTF\\|secret\\|password' $(git rev-list --all)",
      "git stash list",
      "git fsck --lost-found",
    ],
    thought: [
      "Secrets deleted from the working tree often remain in commits, branches, tags, stashes, reflog, or dangling blobs.",
      "Search all reachable history, not only current files.",
    ],
  },
  cloud: {
    commands: [
      "grep -RniE 'AKIA|SECRET|TOKEN|flag\\{|picoCTF\\{|aws_access|private_key|BEGIN ' .",
      "jq '.Records[] | {time:.eventTime,event:.eventName,user:.userIdentity.arn,ip:.sourceIPAddress}' cloudtrail.json",
      "grep -RniE 'AssumeRole|CreateAccessKey|PutObject|GetObject|ListBuckets|UpdateFunctionCode' .",
    ],
    thought: [
      "Cloud CTFs are usually about leaked credentials, overbroad IAM, public buckets, function logs, or Terraform state.",
      "Trace identity and API calls in time order.",
    ],
  },
};

/* Concept explanation + how-to-apply steps, shared by every guide built on a recipe.
   These describe the methodology of the whole family; the per-guide symptoms tell you
   which family you are in. */
const recipeDetails = {
  file: {
    explain:
      "A file's extension is just a label the user picked — the real type is decided by the first few bytes, called magic bytes (`FF D8 FF` = JPEG, `89 50 4E 47` = PNG, `50 4B` = ZIP, `7F 45 4C 46` = ELF). CTF authors exploit the gap between label and reality: renaming a ZIP to `.png`, appending one file after another, or hiding a payload that only `file`, `strings`, or `binwalk` will reveal.\n\nThe whole family is about refusing to trust the name and instead interrogating the bytes — identify, read the readable parts, then peel back whatever container you actually have.",
    apply: [
      "Swap `<target>` for your real filename and run `file <target>` first — believe its answer over the extension.",
      "If `file` says a known type, open it the right way; if it says `data`, look at `xxd` output for a recognisable signature buried inside.",
      "Run the `strings | grep` line — many easy challenges leave the flag in readable text you can grab in one step.",
      "If `binwalk` or `exiftool` reveals an embedded or trailing file, extract it and start this same checklist over on the new artifact.",
    ],
  },
  archive: {
    explain:
      "Archives (ZIP, 7z, tar, RAR) are containers, and the puzzle is usually in how they're packed: a hidden comment, files whose names spell a message, deliberately nested layers, or weak password protection. Listing the contents before extracting tells you about odd paths, comments, and nesting without spilling files everywhere.",
    apply: [
      "List before you extract: `7z l <archive>` shows comments, sizes, and suspicious names up front.",
      "Extract into a clean folder (`-oout`) so you can `find` and `grep` the results without polluting your working directory.",
      "After each extraction, re-run `file` on every output — nested archives are the whole point of many of these.",
      "If it's password-protected, search the challenge text, filenames, and metadata for the password before cracking with `zip2john`/`john`.",
    ],
  },
  image: {
    explain:
      "Images can hide data in many independent places: metadata fields, bytes appended after the image officially ends, the low bits of pixel colours (LSB), the alpha channel, palette ordering, or simply text rendered into the picture that `strings` will never see. Lossless formats (PNG/BMP) support bit-level stego; lossy JPEG destroys it, so JPEG challenges lean on metadata, appended data, or visual clues instead.",
    apply: [
      "Run metadata and embedded-data checks first (`exiftool`, `binwalk`, `strings`) — they're fast and catch the easy hides.",
      "Note the format: PNG/BMP → try `zsteg` and bit-plane tools; JPEG → skip LSB and focus on metadata, appended data, and visual inspection.",
      "If the prompt mentions colours, pixels, or 'look closer', open the image large and try contrast/inversion before reaching for code.",
      "When a tool extracts a new file or you decode pixel bits into bytes, identify that output with `file` and continue from there.",
    ],
  },
  audio: {
    explain:
      "Audio challenges hide information in a domain you can't hear directly. The most common trick is a spectrogram — text or a picture painted into the frequency/time plot. Others encode Morse or DTMF tones, reverse the clip, change its speed, or bury data in the least-significant bits of WAV samples.",
    apply: [
      "Generate a spectrogram (`sox <file> -n spectrogram`) and open it — visual text here is the single most common audio answer.",
      "Listen for structure: steady beeps suggest Morse, phone-keypad tones suggest DTMF (`multimon-ng`).",
      "If speech or tones sound wrong, try reversing (`ffmpeg -af areverse`) or changing tempo.",
      "For a clean WAV with no obvious audio clue, treat it like LSB stego and extract the low bits of the samples.",
    ],
  },
  video: {
    explain:
      "Video bundles several streams — frames, audio, subtitles, and metadata — and the clue usually lives in just one. A QR code or flag may flash for a single frame you'll never catch during playback, so the reliable move is to explode the video into individual frames and inspect them.",
    apply: [
      "Extract every frame with `ffmpeg -i video frames/frame_%05d.png`, then scan the folder (grep, or `zbarimg` for QR codes).",
      "Check the other streams too: `ffprobe` for stream list, `exiftool` for metadata, and look for an embedded or external subtitle track.",
      "If the audio stream seems meaningful, pull it out and run it through the audio playbook (spectrogram, Morse, reverse).",
      "Found a QR or text frame? Decode/zoom it, then treat its contents as the next layer.",
    ],
  },
  disk: {
    explain:
      "A disk image is a byte-for-byte copy of a filesystem (FAT/NTFS/EXT, an ISO, or a raw `.dd`). The interesting data is often deleted, hidden in slack/unallocated space, or sitting in OS artifacts. The Sleuth Kit (`mmls`, `fls`, `icat`) lets you walk partitions and recover files — including deleted ones — without mounting anything.",
    apply: [
      "`mmls disk.img` to find partitions and their sector offsets; note the offset, you'll need it for every later command.",
      "`fls -r -o <offset> disk.img` lists live and deleted entries (deleted ones are marked with `*`).",
      "`icat -o <offset> disk.img <inode> > out` carves a specific file by its inode number.",
      "Finish with `strings`/`binwalk` over the whole image to sweep unallocated space the filesystem no longer references.",
    ],
  },
  memory: {
    explain:
      "A memory (RAM) dump is a frozen snapshot of a running machine — processes, command lines, network connections, clipboard, and sometimes passwords and keys live inside it. Volatility 3 parses that structure for you, but it's huge, so you work top-down: identify the OS, list processes, then pivot to whatever the prompt hints at.",
    apply: [
      "Identify the OS first (`windows.info` or `linux.banners`) — every later plugin depends on it.",
      "List processes (`pslist`) and their command lines (`cmdline`) to spot what was actually running.",
      "Match the plugin to the hint: browser → web plugins, network → `netscan`, malware → `malfind`/process dump.",
      "Run `strings | grep` over the raw dump as a fast parallel check for flags, passwords, and commands.",
    ],
  },
  pcap: {
    explain:
      "A packet capture records network traffic. Flags hide in HTTP bodies, cookies and headers, DNS query names, ICMP payloads, plaintext FTP/SMTP sessions, or files that were transferred and can be reassembled. A protocol summary tells you where the interesting traffic is before you start following individual streams.",
    apply: [
      "Get the lay of the land with `tshark -q -z io,phs` (protocol hierarchy) — it shows which protocols are even present.",
      "Filter to the promising protocol and read it; `tcpflow` reassembles TCP conversations into files.",
      "Carve transferred files (Wireshark 'Export Objects', `foremost`) and identify them with `file`.",
      "Run `strings | grep` across the raw pcap for credentials, cookies, and flag patterns as a quick win.",
    ],
  },
  web: {
    explain:
      "Web challenges reward reconnaissance before exploitation. Before attacking a parameter you map the application: its routes, parameters, cookies, response headers, and any leaked source (`robots.txt`, `.env`, `.git`, source maps). Leaked source is gold — it tells you exact routes, secrets, and where the flag lives.",
    apply: [
      "Replace `host` with your target and curl the basics: `/`, `robots.txt`, `.env`, `.git/HEAD`, plus the response headers (`-i`).",
      "Fuzz for hidden content with `ffuf` and a wordlist to find admin paths, backups, and API routes.",
      "Read whatever you find — comments, JS files, and source maps often reveal the intended bug class.",
      "Then pick the attack the parameter invites (SQLi, LFI, SSTI, SSRF, upload, auth) and switch to that specific playbook.",
    ],
  },
  injection: {
    explain:
      "Injection bugs all share one tell: a tiny probe changes the response in a way that reveals an interpreter behind the parameter. A quote breaks SQL, `{{7*7}}` becoming `49` reveals a template engine, `../` reaching a file reveals path traversal, and `;id` running reveals command injection. You confirm the interpreter first, then escalate carefully.",
    apply: [
      "Send harmless probes one at a time and compare status code, response length, errors, and reflected output against a normal request.",
      "Map the symptom to the bug: SQL error → SQLi, `49` → SSTI, file contents → LFI, command output → RCE.",
      "Once you know the interpreter, switch to that bug's dedicated playbook for the right payloads.",
      "Keep payloads minimal and read-only on CTF infrastructure — prove the bug before doing anything heavier.",
    ],
  },
  crypto: {
    explain:
      "The first job in any crypto challenge is identifying the representation: is it an encoding (base64/hex), a classical cipher, XOR, a block cipher, RSA, a weak PRNG, or a hash? The structural clues — alphabet, length, repeated blocks, given variables, reused nonces — point to the family and therefore the attack.",
    apply: [
      "Look at the raw text: measure length and the set of characters used (`len` vs `unique`) to narrow the family.",
      "Symbols/`=`/digits → try decoding (base64, hex) first; letters only → think classical cipher; binary blob → XOR or block cipher.",
      "If numbers like `n`, `e`, `c` or coordinate pairs are given, you're in RSA / secret-sharing territory — jump to that playbook.",
      "Decode or attack one layer, then re-examine the output; crypto challenges are usually stacked.",
    ],
  },
  rsa: {
    explain:
      "Textbook RSA is secure only with good parameters; CTF RSA is about the mistakes. The private key `d` follows immediately once you know `phi`, which needs the factors `p` and `q`. So the attacks are really 'how do I factor `n`, or skip factoring': leaked factors, tiny `e` with no padding, primes that are too close (Fermat), a shared prime across keys (GCD), reused messages, or a partially-leaked key.",
    apply: [
      "Parse every number the challenge gives you (`n`, `e`, `c`, and any of `p`, `q`, `phi`, `d`, `dp`, `dq`).",
      "If `p`/`q` or `phi` is present, compute `d = e⁻¹ mod phi` and decrypt — no factoring needed.",
      "Otherwise pick the attack from the giveaway: tiny `e` → e-th root; close primes → Fermat; many moduli → pairwise GCD.",
      "When stuck, throw it at `RsaCtfTool` which automates the common parameter attacks.",
    ],
  },
  block: {
    explain:
      "Block ciphers leak through their mode of operation, not the cipher itself. ECB encrypts identical plaintext blocks to identical ciphertext blocks, so repetition is visible. CBC can be bit-flipped (changing a ciphertext block flips controlled bits in the next plaintext block) or attacked via a padding oracle. CTR/GCM collapse to a stream cipher and break completely if a nonce is reused.",
    apply: [
      "Split the ciphertext into 16-byte blocks and count repeats — repeated blocks scream ECB.",
      "Identify the mode from the hint (IV present → CBC; nonce/counter → CTR; tag → GCM) and pick the matching attack.",
      "If the server returns different errors for bad padding vs bad content, you have a padding oracle — recover plaintext block by block.",
      "For any reused nonce/keystream, XOR the two ciphertexts together to start recovering plaintext.",
    ],
  },
  pwn: {
    explain:
      "Binary exploitation starts with reconnaissance, not payloads. `checksec` tells you which mitigations are on (canary, NX, PIE, RELRO), and that set decides which technique is even possible. Easy pwn is usually a single clear bug: a `win`/`print_flag` function to jump to (ret2win), a format string, a ret2libc, or an unsafe `gets`/`scanf`.",
    apply: [
      "Run `checksec --file ./chall` and write down the mitigations — they rule techniques in or out.",
      "Look for shortcuts: a `win`/`flag`/`system` symbol (`nm`/`strings`) means you may only need to redirect execution there.",
      "Find the offset to the return address with a cyclic pattern, then build the smallest payload that proves control.",
      "On 64-bit, remember stack alignment (an extra `ret` gadget) and match the right libc when calling into it.",
    ],
  },
  rev: {
    explain:
      "Reverse engineering is about understanding what a program checks and then satisfying or bypassing it. You go from cheap to expensive: readable strings, then dynamic traces of comparison calls, then full decompilation of the validation routine. The flag is either a literal string, something the program builds at runtime, or input that satisfies a checker you can reimplement or patch.",
    apply: [
      "Start with `strings | grep` for flags, passwords, and 'correct'/'wrong' messages — sometimes that's the whole challenge.",
      "Trace dynamically (`ltrace`/`strace`) to catch `strcmp`/`memcmp` arguments without reading assembly.",
      "Decompile the validation function (Ghidra) and read what it actually compares your input against.",
      "If logic is too tangled, reimplement the check in Python or patch the conditional branch to accept any input.",
    ],
  },
  mobile: {
    explain:
      "A mobile app (APK/IPA) is a ZIP-like container holding resources, config, compiled bytecode, native libraries, and local databases. Secrets hide across all of those layers — Java/Kotlin code, `assets/`, `res/`, native `.so` files, or SQLite/SharedPreferences data — so you decompile and search broadly before focusing on the code path that validates the flag.",
    apply: [
      "Unzip/inspect the package, then decompile: `jadx` for readable Java/Kotlin, `apktool` for resources and smali.",
      "Grep the decompiled output for `flag`, `secret`, `password`, `firebase`, and API keys across every folder.",
      "Don't forget native libs — check `.so` files with `strings` if the Java side looks clean.",
      "Trace how the app reads/validates the flag and follow that path to the source or the stored secret.",
    ],
  },
  email: {
    explain:
      "An email file (`.eml`/`.msg`) is structured text: headers that record routing and authentication (`Received`, `DKIM`, `SPF`, `From`) plus a MIME body that can carry quoted-printable or base64-encoded parts and attachments. The clue is usually a spoofed/odd header or a payload tucked inside an encoded MIME part.",
    apply: [
      "Read the headers top to bottom — `Received` chains and `From`/`Reply-To` mismatches reveal spoofing and the real origin.",
      "Extract MIME parts and attachments (`ripmime`/`munpack`) and identify each with `file`.",
      "Decode encoded bodies (quoted-printable `=3D`, or base64) — the actual message often hides there.",
      "Follow any links or attachments as the next artifact in the chain.",
    ],
  },
  logs: {
    explain:
      "Log challenges are needle-in-haystack timelines. The skill is summarising first — counting IPs, requests, or events — so the rare anomaly stands out against the noise, then reconstructing the sequence: initial access, privilege change, command execution, exfiltration, flag access.",
    apply: [
      "Skim the format with `head`, then summarise frequency (`awk '{print $1}' | sort | uniq -c | sort -nr`) to find the odd actor.",
      "Grep for the obvious markers: `Failed`/`Accepted`, `sudo`, SQL keywords, `../`, `cmd=`, `powershell`, upload/admin paths.",
      "Pin the single successful/anomalous event after a run of failures — that's usually the pivot point.",
      "Order events by timestamp (mind the timezone) to build the attacker's full story.",
    ],
  },
  git: {
    explain:
      "A git repository remembers far more than the current files. Anything ever committed survives in history, branches, tags, stashes, the reflog, or as dangling blobs — even if it was 'deleted' or force-pushed away. Searching only the working tree is the mistake; you search all reachable (and unreachable) history.",
    apply: [
      "`git log --oneline --all --decorate --graph` to see every branch and where commits diverge.",
      "Search all of history at once: `git grep <pattern> $(git rev-list --all)`.",
      "Check the side channels: `git stash list`, `git tag`, and `git reflog` for commits no branch points to anymore.",
      "Recover deleted/unreachable objects with `git fsck --lost-found`, then `git show` the blob.",
    ],
  },
  cloud: {
    explain:
      "Cloud challenges usually hinge on leaked credentials or over-permissive configuration rather than memory-corruption-style exploits: an access key in a Docker layer or `.tfstate`, a base64 Kubernetes secret, a public bucket, or an audit log (CloudTrail/CloudWatch) that records a privilege-escalation chain. You hunt for secrets, then trace identity and API calls in time order.",
    apply: [
      "Grep broadly for credential shapes: `AKIA`, `SECRET`, `TOKEN`, `private_key`, `BEGIN`, and flag patterns.",
      "Decode obvious encodings — Kubernetes Secret values and many config blobs are just base64.",
      "For audit logs, project the useful fields with `jq` (time, event, principal ARN, source IP) and sort by time.",
      "Follow the identity: who created keys, assumed roles, or touched storage — that chain leads to the flag.",
    ],
  },
};

const makeGuide = ([id, category, difficulty, title, aliases, symptoms, recipe]) => ({
  id: `expanded-${id}`,
  category,
  difficulty,
  title,
  aliases,
  symptoms,
  commands: [sh(recipes[recipe].commands)],
  thought: recipes[recipe].thought,
  explain: recipeDetails[recipe].explain,
  apply: recipeDetails[recipe].apply,
  pitfalls: [
    "Work on a copy of the artifact when patching, carving, or extracting.",
    "If the first command gives a new file, restart triage on that new file.",
  ],
});

const specs = [
  ["file-wrong-magic", "Forensics", "Beginner", "Magic bytes mismatch", ["magic bytes", "header mismatch", "file signature"], "Extension and file signature disagree.", "file"],
  ["file-hidden-after-eof", "Forensics", "Easy", "Data hidden after EOF marker", ["after eof", "trailing bytes", "iend", "ffd9"], "A valid image/document has extra bytes after its formal end marker.", "file"],
  ["file-polyglot", "Forensics", "Medium", "Polyglot file", ["polyglot", "png zip", "pdf zip"], "One file behaves as two formats depending on parser.", "file"],
  ["file-hex-dump", "Forensics", "Beginner", "Rebuild from hex dump", ["hexdump", "xxd reverse", "hex to file"], "Challenge gives a textual hex dump instead of the real file.", "file"],
  ["file-base64-blob", "Forensics", "Beginner", "Base64 blob to file", ["base64 file", "blob", "decode file"], "Text blob decodes into an image/archive/binary.", "file"],
  ["file-compression-unknown", "Forensics", "Easy", "Unknown compressed data", ["zlib", "gzip", "bz2", "xz", "compressed"], "File command or magic bytes point to compression.", "file"],
  ["file-thumbnail-cache", "Forensics", "Medium", "Thumbnail cache recovery", ["thumbcache", "thumbnail", "windows cache"], "Windows artifact may contain cached image thumbnails.", "file"],
  ["file-ds-store", "Forensics", "Easy", "macOS .DS_Store clue", ["ds_store", "macos folder"], ".DS_Store appears in web or filesystem challenge.", "file"],
  ["file-swap", "Forensics", "Medium", "Swap file string recovery", ["swap", "pagefile", "hiberfil"], "Large OS swap/hibernation artifact may contain old plaintext.", "file"],
  ["file-printer-spool", "Forensics", "Medium", "Printer spool recovery", ["printer", "spool", "spl", "shd"], "Challenge includes Windows print spool files.", "file"],

  ["archive-comment", "Forensics", "Beginner", "ZIP comment clue", ["zip comment", "archive comment"], "Archive has a comment or file comments.", "archive"],
  ["archive-symlink", "Forensics", "Medium", "Archive symlink trick", ["tar symlink", "zip symlink"], "Archive entries include symlinks or absolute paths.", "archive"],
  ["archive-crc", "Forensics", "Medium", "ZIP CRC clue", ["crc", "known plaintext", "zip crc"], "ZIP metadata leaks CRC values or file sizes.", "archive"],
  ["archive-rar", "Forensics", "Easy", "RAR archive extraction", ["rar", "unrar"], "Challenge uses RAR instead of ZIP.", "archive"],
  ["archive-7z", "Forensics", "Easy", "7z archive extraction", ["7z", "7zip"], "Challenge uses 7z format.", "archive"],
  ["archive-tar-layer", "Forensics", "Beginner", "Tar/gzip nesting", ["tar", "tgz", "gz"], "Repeated tar/gzip layers reveal final artifact.", "archive"],
  ["archive-wordlist", "Forensics", "Easy", "Crack weak archive password", ["zip2john", "rar2john", "john"], "Archive is encrypted with a weak or hinted password.", "archive"],
  ["archive-filename-flag", "Forensics", "Beginner", "Flag split across filenames", ["filenames", "chunks in names"], "Many files have names that form a message.", "archive"],
  ["archive-ordering", "Forensics", "Beginner", "Reassemble archive by order", ["numbered files", "ordered chunks"], "Extracted files need numeric/timestamp ordering.", "archive"],
  ["archive-bomb-safe", "Forensics", "Medium", "Safe handling of suspicious archive", ["zip bomb", "huge archive"], "Archive appears tiny but expands suspiciously.", "archive"],

  ["image-exif-gps", "Forensics", "Easy", "EXIF GPS coordinates", ["gps", "location", "exif gps"], "Metadata contains GPS coordinates used as clue or flag path.", "image"],
  ["image-steg-passphrase", "Forensics", "Easy", "Steghide with passphrase", ["steghide", "passphrase"], "Image likely contains steghide payload and a hinted password.", "image"],
  ["image-outguess", "Forensics", "Medium", "OutGuess image stego", ["outguess", "jpeg stego"], "JPEG steganography challenge hints at outguess.", "image"],
  ["image-stegsolve", "Forensics", "Easy", "Bit plane visual inspection", ["stegsolve", "bit plane"], "Subtle image differences may appear in one color bit plane.", "image"],
  ["image-qr-hidden", "Forensics", "Easy", "Hidden QR in image", ["qr", "hidden qr"], "Image contains a faint, cropped, inverted, or channel-hidden QR code.", "image"],
  ["image-invert", "Forensics", "Beginner", "Low contrast or inverted text", ["invert", "contrast", "brightness"], "Text is barely visible until contrast/inversion changes.", "image"],
  ["image-dimensions", "Forensics", "Beginner", "Dimensions encode message", ["width height", "dimensions"], "Image dimensions or repeated resize values look intentional.", "image"],
  ["image-histogram", "Forensics", "Medium", "Histogram clue", ["histogram", "color counts"], "Color frequencies encode values or password.", "image"],
  ["image-braille", "Forensics", "Easy", "Braille pattern in pixels", ["braille", "dots"], "Image contains dot groups resembling Braille.", "image"],
  ["image-font-ligature", "Forensics", "Medium", "Font or homoglyph stego", ["font", "ligature", "homoglyph"], "Text image/document uses suspicious similar-looking glyphs.", "image"],

  ["audio-morse", "Forensics", "Beginner", "Morse code audio", ["morse", "beeps"], "Audio contains short and long beeps.", "audio"],
  ["audio-dtmf", "Forensics", "Easy", "DTMF tone decoding", ["dtmf", "phone tones"], "Audio sounds like phone keypad tones.", "audio"],
  ["audio-sstv", "Forensics", "Medium", "SSTV signal", ["sstv", "robot36"], "Audio sounds like radio/image transmission.", "audio"],
  ["audio-reversed", "Forensics", "Beginner", "Reversed audio message", ["reverse audio", "backwards"], "Speech or tones sound backwards.", "audio"],
  ["audio-speed", "Forensics", "Beginner", "Wrong speed audio", ["slow", "fast", "tempo"], "Audio is too slow or too fast to understand.", "audio"],
  ["audio-lsb", "Forensics", "Medium", "WAV LSB data", ["wav lsb", "audio stego"], "WAV file likely hides data in low bits.", "audio"],
  ["audio-channel-diff", "Forensics", "Medium", "Stereo channel difference", ["left right", "stereo diff"], "Message appears only in one channel or channel subtraction.", "audio"],
  ["audio-silence", "Forensics", "Easy", "Hidden data in silence", ["silence", "quiet"], "Long silence or noise floor may contain encoded signal.", "audio"],

  ["video-subtitles", "Forensics", "Easy", "Hidden subtitle track", ["srt", "subtitles", "captions"], "Video has subtitle/caption metadata or external .srt.", "video"],
  ["video-qr-frame", "Forensics", "Beginner", "QR appears for one frame", ["one frame qr", "video qr"], "A QR or flag flashes briefly.", "video"],
  ["video-audio-track", "Forensics", "Easy", "Separate audio track clue", ["video audio", "extract audio"], "Video contains an audio stream with hidden data.", "video"],
  ["video-corrupt-mp4", "Forensics", "Medium", "Corrupted MP4 repair", ["mp4 repair", "moov atom"], "MP4 does not play or has missing metadata atom.", "video"],
  ["video-frame-timestamps", "Forensics", "Medium", "Frame timestamps encode data", ["timestamps", "frame timing"], "Frame timing or durations look patterned.", "video"],

  ["disk-fat-deleted", "Forensics", "Medium", "Recover deleted FAT file", ["fat", "deleted file"], "FAT image contains deleted entries.", "disk"],
  ["disk-ext4-inode", "Forensics", "Medium", "EXT4 inode recovery", ["ext4", "inode"], "EXT filesystem image has deleted or renamed files.", "disk"],
  ["disk-ntfs-mft", "Forensics", "Medium", "NTFS MFT investigation", ["mft", "ntfs"], "NTFS image requires $MFT inspection.", "disk"],
  ["disk-recycle-bin", "Forensics", "Easy", "Windows Recycle Bin artifact", ["recycle bin", "$I", "$R"], "Disk image contains `$Recycle.Bin` metadata.", "disk"],
  ["disk-usb-artifacts", "Forensics", "Medium", "USB copy artifact", ["usb", "mounted devices"], "Question asks what file was copied to USB.", "disk"],
  ["disk-registry-hive", "Forensics", "Medium", "Windows registry hive clue", ["registry", "sam", "software", "ntuser"], "Windows hives contain user/app/system artifacts.", "disk"],
  ["disk-browser-history", "Forensics", "Easy", "Browser history from disk", ["history", "chrome", "firefox"], "Disk image contains browser profile.", "disk"],
  ["disk-apfs-snapshot", "Forensics", "Hard", "APFS snapshot recovery", ["apfs", "snapshot"], "macOS APFS image may have snapshots.", "disk"],
  ["disk-raid", "Forensics", "Hard", "RAID reconstruction", ["raid", "stripe", "disk set"], "Multiple disk chunks must be ordered as RAID.", "disk"],
  ["disk-timestomp", "Forensics", "Medium", "Timestomping detection", ["timestamp", "timestomp"], "File times look inconsistent or forged.", "disk"],

  ["memory-clipboard", "Forensics", "Easy", "Clipboard from memory", ["clipboard", "ram"], "Question asks what was copied.", "memory"],
  ["memory-browser-tabs", "Forensics", "Medium", "Browser tabs from RAM", ["browser tabs", "chrome memory"], "Memory dump includes browser state.", "memory"],
  ["memory-password", "Forensics", "Medium", "Password in memory", ["password", "credentials", "ram"], "Prompt hints password was typed recently.", "memory"],
  ["memory-ssh-key", "Forensics", "Hard", "SSH key in memory", ["ssh key", "private key"], "Memory may contain key material.", "memory"],
  ["memory-malware-proc", "Forensics", "Medium", "Suspicious process in memory", ["malware", "process"], "Need identify malicious process.", "memory"],
  ["memory-injection", "Forensics", "Hard", "Process injection detection", ["injected process", "hollowing"], "Malware injection or hollowing suspected.", "memory"],
  ["memory-c2", "Forensics", "Medium", "C2 domain in memory", ["c2", "domain", "netscan"], "Need find command-and-control domain.", "memory"],
  ["memory-ransomware", "Forensics", "Medium", "Ransomware process trace", ["ransomware", "encrypted"], "Memory dump captured ransomware execution.", "memory"],

  ["pcap-http-file", "Network", "Easy", "Extract file from HTTP PCAP", ["http object", "file transfer"], "HTTP capture contains transferred file.", "pcap"],
  ["pcap-basic-auth", "Network", "Beginner", "HTTP Basic Auth credentials", ["basic auth", "authorization"], "Authorization header appears in HTTP traffic.", "pcap"],
  ["pcap-cookie", "Network", "Beginner", "Flag in cookie/header", ["cookie", "header", "user-agent"], "HTTP headers contain encoded or direct flag.", "pcap"],
  ["pcap-websocket", "Network", "Medium", "WebSocket messages", ["websocket", "ws"], "Capture contains websocket frames.", "pcap"],
  ["pcap-smb", "Network", "Medium", "SMB file transfer", ["smb", "ntlm", "file share"], "PCAP includes SMB traffic or Windows file transfer.", "pcap"],
  ["pcap-bluetooth", "Network", "Hard", "Bluetooth capture", ["bluetooth", "btle"], "Capture includes Bluetooth traffic.", "pcap"],
  ["pcap-arp-spoof", "Network", "Easy", "ARP spoofing analysis", ["arp", "mitm"], "Need identify attacker IP/MAC in ARP traffic.", "pcap"],
  ["pcap-portscan", "Network", "Beginner", "Port scan detection", ["port scan", "nmap"], "Capture includes many connection attempts.", "pcap"],
  ["pcap-tls-sni", "Network", "Easy", "TLS SNI clue", ["tls", "sni", "https"], "Encrypted traffic still leaks hostnames.", "pcap"],
  ["pcap-timing", "Network", "Hard", "Packet timing covert channel", ["timing", "covert"], "Inter-packet delays encode bits.", "pcap"],

  ["web-hidden-robots", "Web", "Beginner", "robots.txt hidden path", ["robots", "hidden path"], "robots.txt points to interesting route.", "web"],
  ["web-admin-js", "Web", "Beginner", "Admin path in JavaScript", ["javascript", "admin path"], "Frontend JS contains hidden route/API.", "web"],
  ["web-source-map", "Web", "Easy", "Source map leak", ["sourcemap", ".map"], "JS references sourceMappingURL.", "web"],
  ["web-env-leak", "Web", "Beginner", ".env leak", [".env", "secret key"], "Server exposes environment file.", "web"],
  ["web-flask-cookie", "Web", "Easy", "Flask signed cookie", ["flask", "session cookie"], "Cookie looks like Flask session.", "web"],
  ["web-django-secret", "Web", "Medium", "Django SECRET_KEY leak", ["django", "secret_key"], "Source/config leaks Django key.", "web"],
  ["web-laravel-env", "Web", "Easy", "Laravel .env exposure", ["laravel", ".env"], "Laravel app exposes .env or debug page.", "web"],
  ["web-spring-actuator", "Web", "Medium", "Spring actuator exposure", ["spring", "actuator"], "Java app exposes actuator endpoints.", "web"],
  ["web-tomcat-manager", "Web", "Easy", "Tomcat manager weak creds", ["tomcat", "manager"], "Tomcat manager login is exposed.", "web"],
  ["web-graphql-auth", "Web", "Medium", "GraphQL field authorization bypass", ["graphql", "auth"], "Some GraphQL fields may ignore auth.", "web"],
  ["web-mass-assignment", "Web", "Easy", "Mass assignment", ["mass assignment", "isAdmin"], "JSON body can set hidden fields like role/admin.", "web"],
  ["web-cache-poison", "Web", "Hard", "Web cache poisoning", ["cache poisoning", "vary"], "Cacheable response depends on attacker-controlled header.", "web"],
  ["web-host-header", "Web", "Medium", "Host header injection", ["host header", "password reset"], "App trusts Host header for links or routing.", "web"],
  ["web-csp-bypass", "Web", "Hard", "CSP bypass", ["csp", "xss bypass"], "XSS exists but CSP blocks simple script execution.", "web"],
  ["web-clickjacking", "Web", "Easy", "Clickjacking", ["iframe", "x-frame"], "Sensitive action page can be framed.", "web"],
  ["web-url-parser", "Web", "Medium", "URL parser confusion", ["url parser", "ssrf bypass"], "Filters and fetcher parse URL differently.", "web"],
  ["web-unicode-normal", "Web", "Medium", "Unicode normalization bypass", ["unicode", "normalization"], "Auth/path checks differ before and after normalization.", "web"],
  ["web-race", "Web", "Medium", "Race condition", ["race", "coupon", "double spend"], "Repeated concurrent requests bypass state update.", "web"],
  ["web-reset-token", "Web", "Medium", "Password reset token prediction", ["reset token", "predictable token"], "Reset/invite codes are short or time-derived.", "web"],
  ["web-rate-limit", "Web", "Easy", "Rate limit bypass", ["rate limit", "xff"], "Brute force is blocked per IP/session/header.", "web"],

  ["crypto-atbash", "Cryptography", "Beginner", "Atbash cipher", ["atbash"], "Alphabet appears reversed or title hints mirror/reverse.", "crypto"],
  ["crypto-affine", "Cryptography", "Easy", "Affine cipher", ["affine"], "Classical cipher with multiplicative shift.", "crypto"],
  ["crypto-vigenere", "Cryptography", "Easy", "Vigenere cipher", ["vigenere", "keyed caesar"], "Repeated-key alphabetic cipher.", "crypto"],
  ["crypto-railfence", "Cryptography", "Easy", "Rail fence cipher", ["rail fence", "zigzag"], "Text order is transposed in rails.", "crypto"],
  ["crypto-columnar", "Cryptography", "Medium", "Columnar transposition", ["columnar", "transposition"], "Letters are permuted but frequency stays language-like.", "crypto"],
  ["crypto-bacon", "Cryptography", "Beginner", "Bacon cipher", ["bacon", "a b"], "Message uses two symbol classes.", "crypto"],
  ["crypto-morse-text", "Cryptography", "Beginner", "Morse text", ["morse", "dots dashes"], "Ciphertext contains dots, dashes, slashes.", "crypto"],
  ["crypto-otp-reuse", "Cryptography", "Medium", "One-time pad reuse", ["otp reuse", "many time pad"], "Multiple ciphertexts share one pad.", "crypto"],
  ["crypto-lcg", "Cryptography", "Medium", "LCG prediction", ["lcg", "linear congruential"], "Outputs come from modular linear recurrence.", "crypto"],
  ["crypto-mt19937", "Cryptography", "Medium", "Mersenne Twister state recovery", ["mt19937", "mersenne"], "Many Python random outputs are leaked.", "crypto"],
  ["crypto-lfsr", "Cryptography", "Hard", "LFSR stream cipher", ["lfsr", "linear feedback"], "Keystream bits follow linear recurrence.", "crypto"],
  ["crypto-crc32", "Cryptography", "Medium", "CRC32 reversal or collision", ["crc32", "checksum"], "CRC used as if it were secure.", "crypto"],
  ["crypto-gcm-nonce", "Cryptography", "Hard", "AES-GCM nonce reuse", ["gcm", "nonce reuse"], "Same GCM nonce appears twice.", "block"],
  ["crypto-dh-small", "Cryptography", "Medium", "Weak Diffie-Hellman", ["diffie hellman", "small subgroup"], "DH uses small group, bad generator, or reused secret.", "crypto"],
  ["crypto-ecdsa-biased", "Cryptography", "Hard", "ECDSA biased nonce", ["ecdsa", "biased nonce"], "Signatures leak partial nonce bits.", "crypto"],
  ["crypto-wiener", "Cryptography", "Hard", "RSA Wiener attack", ["wiener", "small d"], "RSA private exponent is too small.", "rsa"],
  ["crypto-fermat", "Cryptography", "Medium", "RSA close primes", ["fermat", "close primes"], "p and q are very close.", "rsa"],
  ["crypto-common-modulus", "Cryptography", "Medium", "RSA common modulus", ["common modulus"], "Same n used with different e.", "rsa"],
  ["crypto-partial-key", "Cryptography", "Hard", "RSA partial key exposure", ["partial p", "partial d"], "Some bits of p, q, d, dp, or dq are leaked.", "rsa"],

  ["pwn-gets", "Binary Exploit", "Easy", "Unsafe gets overflow", ["gets", "overflow"], "Binary imports gets or unsafe scanf.", "pwn"],
  ["pwn-scanf", "Binary Exploit", "Easy", "scanf width bug", ["scanf", "width"], "Input reads into fixed buffer without width limit.", "pwn"],
  ["pwn-got", "Binary Exploit", "Medium", "GOT overwrite", ["got", "plt", "relro"], "Partial/no RELRO allows GOT overwrite.", "pwn"],
  ["pwn-ret2csu", "Binary Exploit", "Medium", "ret2csu", ["__libc_csu_init", "csu"], "Need set multiple registers for a function call.", "pwn"],
  ["pwn-stack-pivot", "Binary Exploit", "Medium", "Stack pivot", ["pivot", "leave ret"], "Overflow space is too small for full ROP chain.", "pwn"],
  ["pwn-one-gadget", "Binary Exploit", "Medium", "one_gadget libc", ["one_gadget", "libc"], "Can control RIP after libc base leak.", "pwn"],
  ["pwn-ret2dlresolve", "Binary Exploit", "Hard", "ret2dlresolve", ["dlresolve", "dynamic linker"], "No useful libc leak, but dynamic linker is available.", "pwn"],
  ["pwn-shellcode", "Binary Exploit", "Medium", "Shellcode injection", ["shellcode", "mprotect"], "NX is disabled or mprotect can mark memory executable.", "pwn"],
  ["pwn-badchars", "Binary Exploit", "Medium", "Bad character shellcode", ["badchars", "alphanumeric"], "Input filters bytes from payload.", "pwn"],
  ["pwn-suid-path", "Binary Exploit", "Easy", "SUID PATH hijack", ["suid", "path hijack"], "SUID helper calls relative command.", "pwn"],
  ["pwn-env", "Binary Exploit", "Easy", "Environment variable exploit", ["env", "ld_preload"], "Binary trusts env vars, PATH, or dynamic loader settings.", "pwn"],
  ["pwn-toctou", "Binary Exploit", "Medium", "TOCTOU race", ["toctou", "race"], "Program checks a file then opens it later.", "pwn"],
  ["pwn-integer", "Binary Exploit", "Medium", "Integer overflow", ["integer overflow", "signedness"], "Size or index wraps before allocation/copy.", "pwn"],
  ["pwn-offbyone", "Binary Exploit", "Medium", "Off-by-one overwrite", ["off by one", "off-by-null"], "One extra byte corrupts saved frame or heap metadata.", "pwn"],
  ["pwn-uaf", "Binary Exploit", "Hard", "Use-after-free", ["uaf", "heap"], "Program uses pointer after free.", "pwn"],
  ["pwn-double-free", "Binary Exploit", "Hard", "Double free", ["double free", "tcache"], "Same heap chunk can be freed twice.", "pwn"],
  ["pwn-fastbin", "Binary Exploit", "Hard", "Fastbin dup", ["fastbin", "heap"], "Older glibc fastbin freelist can be corrupted.", "pwn"],

  ["rev-java", "Reverse Engineering", "Easy", "Java JAR decompile", ["jar", "java"], "Challenge ships .jar or .class files.", "rev"],
  ["rev-python-pyc", "Reverse Engineering", "Easy", "Python bytecode decompile", ["pyc", "python bytecode"], "Challenge provides .pyc files.", "rev"],
  ["rev-lua", "Reverse Engineering", "Medium", "Lua bytecode reversing", ["lua", "luac"], "Lua bytecode or game script is provided.", "rev"],
  ["rev-rust", "Reverse Engineering", "Medium", "Rust binary reversing", ["rust", "panic"], "Binary contains Rust symbols/panic strings.", "rev"],
  ["rev-swift", "Reverse Engineering", "Medium", "Swift binary reversing", ["swift", "macho"], "macOS/iOS binary built with Swift.", "rev"],
  ["rev-objective-c", "Reverse Engineering", "Medium", "Objective-C selector analysis", ["objc", "selector"], "Mach-O contains Objective-C selectors/classes.", "rev"],
  ["rev-unity", "Reverse Engineering", "Medium", "Unity/Mono game reversing", ["unity", "mono", "assembly-csharp"], "Game includes Assembly-CSharp.dll or Unity assets.", "rev"],
  ["rev-electron", "Reverse Engineering", "Easy", "Electron app unpacking", ["electron", "asar"], "Desktop app includes app.asar.", "rev"],
  ["rev-browser-extension", "Reverse Engineering", "Easy", "Browser extension reversing", ["extension", "manifest.json"], "Challenge gives Chrome/Firefox extension.", "rev"],
  ["rev-firmware", "Reverse Engineering", "Hard", "Router/IoT firmware", ["firmware", "binwalk", "squashfs"], "Firmware blob contains filesystem or embedded config.", "rev"],
  ["rev-vm", "Reverse Engineering", "Hard", "Custom VM bytecode", ["vm", "bytecode"], "Binary interprets custom opcodes.", "rev"],
  ["rev-self-modifying", "Reverse Engineering", "Hard", "Self-modifying code", ["self modifying", "packer"], "Static disassembly changes at runtime.", "rev"],
  ["rev-antidebug", "Reverse Engineering", "Medium", "Anti-debugging bypass", ["ptrace", "anti debug"], "Binary detects debugger or VM.", "rev"],
  ["rev-frida", "Reverse Engineering", "Medium", "Runtime hook with Frida", ["frida", "hook"], "Mobile/native check is easier to bypass by hooking.", "rev"],

  ["email-phishing", "Forensics", "Easy", "Phishing email headers", ["email", "phishing", "headers"], "Need identify spoofed sender or malicious link.", "email"],
  ["email-mime", "Forensics", "Easy", "MIME attachment extraction", ["mime", "attachment"], "Email source contains multipart base64 attachments.", "email"],
  ["email-quoted", "Forensics", "Beginner", "Quoted-printable decode", ["quoted printable", "=3D"], "Email body contains quoted-printable encoding.", "email"],
  ["email-calendar", "Forensics", "Easy", "Calendar invite clue", ["ics", "calendar"], "Email contains .ics invite or calendar metadata.", "email"],
  ["email-tracking", "Forensics", "Easy", "Tracking pixel URL clue", ["tracking pixel", "email image"], "HTML email references external image URL.", "email"],

  ["mobile-shared-prefs", "Forensics", "Easy", "Android SharedPreferences flag", ["shared preferences", "android xml"], "Android app data contains XML preferences.", "mobile"],
  ["mobile-sqlite", "Forensics", "Easy", "Mobile SQLite database", ["android sqlite", "ios sqlite"], "Mobile backup/app data contains .sqlite/.db files.", "mobile"],
  ["mobile-logcat", "Forensics", "Easy", "Android logcat artifact", ["logcat", "android logs"], "Logs may contain debug flag output.", "mobile"],
  ["mobile-ios-backup", "Forensics", "Medium", "iOS backup database", ["ios backup", "manifest.db"], "Challenge gives iPhone backup folder.", "mobile"],
  ["mobile-apk-assets", "Reverse Engineering", "Easy", "APK hidden asset", ["apk assets", "resources"], "Flag is in APK asset/resource files.", "mobile"],
  ["mobile-firebase", "Forensics", "Medium", "Firebase config leak", ["firebase", "google-services"], "Mobile app leaks Firebase project config.", "mobile"],

  ["logs-proxy-exfil", "Logs", "Medium", "Proxy log exfiltration", ["proxy", "exfil", "large download"], "Proxy logs show unusual uploads/downloads.", "logs"],
  ["logs-impossible-travel", "Logs", "Easy", "Impossible travel login", ["impossible travel", "geo login"], "Auth logs show same user from distant locations.", "logs"],
  ["logs-api-key", "Logs", "Easy", "API key misuse logs", ["api key", "audit log"], "Audit logs show suspicious API key actions.", "logs"],
  ["logs-webshell", "Logs", "Easy", "Web shell command logs", ["webshell", "cmd"], "Access logs include cmd= or shell paths.", "logs"],
  ["logs-lateral", "Logs", "Medium", "Lateral movement event", ["lateral movement", "windows"], "Windows/Linux logs show movement to another host.", "logs"],
  ["logs-priv-esc", "Logs", "Medium", "Privilege escalation timeline", ["privilege escalation", "sudo"], "Logs show sudo, su, token changes, or admin role grant.", "logs"],

  ["git-reflog", "General Skills", "Easy", "Secret in reflog", ["reflog", "git"], "Commit was removed but reflog remains.", "git"],
  ["git-stash", "General Skills", "Easy", "Secret in git stash", ["stash", "git"], "Uncommitted work was stashed.", "git"],
  ["git-lfs", "General Skills", "Medium", "Git LFS object recovery", ["git lfs", "lfs object"], "Large file stored through Git LFS.", "git"],
  ["git-dangling", "General Skills", "Medium", "Dangling blob recovery", ["dangling blob", "git fsck"], "Deleted blob is unreachable but present.", "git"],
  ["git-tags", "General Skills", "Easy", "Annotated tag message", ["git tag", "tag annotation"], "Flag hidden in tag annotation.", "git"],

  ["cloud-docker-layer", "Forensics", "Easy", "Secret in Docker image layer", ["docker", "image layer"], "Docker image contains deleted secret in older layer.", "cloud"],
  ["cloud-k8s-secret", "Forensics", "Easy", "Kubernetes secret decode", ["kubernetes", "secret", "base64"], "K8s YAML has Secret values.", "cloud"],
  ["cloud-terraform", "Forensics", "Easy", "Terraform state secret", ["terraform", "tfstate"], "tfstate contains credentials or outputs.", "cloud"],
  ["cloud-s3-version", "Forensics", "Medium", "S3 object version recovery", ["s3", "versioning"], "Deleted/overwritten cloud object may have older version.", "cloud"],
  ["cloud-lambda-logs", "Logs", "Easy", "Lambda log flag", ["lambda", "cloudwatch"], "Serverless logs contain stdout/errors with clue.", "cloud"],
  ["cloud-ci-logs", "Logs", "Easy", "CI/CD log secret", ["github actions", "ci logs"], "Build logs leak env vars, tokens, or flag.", "cloud"],
];

export const expandedGuides = specs.map(makeGuide);
