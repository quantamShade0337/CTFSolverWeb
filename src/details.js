export const guideDetails = {
  "binary-digits-image": {
    explain:
      "A computer file is just bytes, and a byte is 8 bits. When a challenge hands you a text file containing nothing but `0` and `1`, those characters are a written-out representation of the bits of some real file. Group them into bytes, and the first few bytes (the magic number) tell you what the hidden file actually is, often an image whose flag you have to *see*, not `grep`.",
    apply: [
      "Confirm it's really just bits: `file` will say ASCII text, and `head` will show only `0`/`1` characters.",
      "Strip whitespace, slice the bit-string into groups of 8, and convert each group to a byte.",
      "Check the first bytes of the result: `FF D8 FF` → JPEG, `89 50 4E 47` → PNG, `50 4B` → ZIP.",
      "Open the decoded file as an image; if it looks like garbage, reverse the bit order inside each byte and decode again.",
    ],
  },
  metadata: {
    explain:
      "Almost every media format carries structured descriptive fields, EXIF on images, document properties on PDFs/Office files, ID3-style tags on audio. Authors love hiding flags in Comment, Author, Artist, GPS, or Software fields because they're invisible in a normal viewer but trivial to read with the right tool.",
    apply: [
      "Run `exiftool <file>` and read every field, not just the obvious ones.",
      "Pay attention to Comment, Artist/Author, GPS, Title, Subject, Software, and CreateDate.",
      "Cross-check with `strings | grep` in case a value is stored outside standard tags.",
      "If metadata is empty, the platform probably stripped it, move on to appended data or pixel-level stego.",
    ],
  },
  "wrong-extension": {
    explain:
      "Extensions are cosmetic, the operating system and most tools decide a file's type from its leading magic bytes. A challenge that won't open, or that `file` disagrees with, is usually just mislabelled. Identify the true type, then rename a copy.",
    apply: [
      "Run `file` and `xxd -l 32` to see the real signature.",
      "Match the signature to a type (e.g. `PK` = ZIP/Office, `%PDF` = PDF, `Rar!` = RAR).",
      "Copy (don't move) the file to the correct extension, then open it with the matching tool.",
      "Never patch bytes just because the name looks odd, verify the signature first.",
    ],
  },
  "corrupt-header": {
    explain:
      "Parsers identify and validate a file by its header. If only the header (the magic bytes) is damaged but the body still contains recognisable chunks like `IHDR`, `JFIF`, or `PK`, repairing the magic bytes restores the parser's ability to read the rest.",
    apply: [
      "Confirm the damage: `file` says `data`, but `xxd`/`grep` finds intact internal markers like `IHDR` or `JFIF`.",
      "Work on a copy, patching is destructive.",
      "Overwrite the broken magic with the correct bytes for that format (e.g. the 8-byte PNG signature) using `dd ... conv=notrunc`.",
      "Validate the repair (`pngcheck`, or just open it) and continue triage on the now-readable file.",
    ],
  },
  "appended-archive": {
    explain:
      "Many formats stop reading at their end-of-file marker and ignore anything after it. That lets an author paste a whole second file (often a ZIP) onto the end of a valid image, the image still opens normally, but a second payload is sitting in the tail. This is the classic polyglot/appended-data trick.",
    apply: [
      "Run `binwalk <file>` to list embedded file signatures and their offsets.",
      "Locate the embedded magic precisely with `grep -abo` (e.g. the ZIP marker `PK\\x03\\x04`).",
      "Carve from that offset with `dd ... skip=<offset>`, or let `foremost`/`binwalk -e` extract it for you.",
      "Identify and open the carved file, then triage it as a fresh artifact.",
    ],
  },
  "nested-archives": {
    explain:
      "Some challenges wrap an archive inside an archive inside an archive, the work is the recursion itself. Each layer may also change format (zip → tar → gz). The trick is to extract methodically and scan after every layer so you don't miss the flag dropped between two of them.",
    apply: [
      "Extract one layer into a clean folder and `file` everything that comes out.",
      "Repeat for each new archive you find, tracking depth so you don't loop.",
      "`grep -R` for the flag after each extraction, it might appear before the final layer.",
      "Be wary of zip bombs: don't run unbounded recursive scripts on suspiciously tiny archives.",
    ],
  },
  "password-archive": {
    explain:
      "An encrypted archive needs its password. In CTFs the password is usually findable, in the prompt, a filename, a comment, or accompanying metadata, and only meant to be brute-forced when the challenge clearly hints at a weak one. `zip2john`/`john` turn the archive into a crackable hash.",
    apply: [
      "First hunt for the password in the challenge text, filenames, comments, and any provided files.",
      "If cracking is intended, extract the hash: `zip2john locked.zip > zip.hash`.",
      "Run `john zip.hash --wordlist=rockyou.txt`, then `john --show` to read the cracked password.",
      "Unzip with the recovered password and continue.",
    ],
  },
  "lsb-image": {
    explain:
      "In a lossless image, changing the least-significant bit of each colour channel is invisible to the eye but can store a hidden message. LSB stego reads those low bits across the pixels and reassembles them into bytes. It only works on lossless formats, JPEG's compression destroys the low bits.",
    apply: [
      "Confirm the format is lossless (PNG/BMP); if it's JPEG, this won't work, switch playbooks.",
      "Try `zsteg image.png` first, it auto-checks many bit/channel combinations.",
      "If that misses, extract the LSB of each channel yourself and assemble the bits into bytes.",
      "Test channels and bit-planes separately (R, G, B) and different bit orders, the encoding varies.",
    ],
  },
  "alpha-channel": {
    explain:
      "A PNG's alpha channel controls transparency, but it's a full data channel like R, G, and B. Authors hide text or images there because most viewers composite it away. Extracting alpha as a standalone grayscale image makes the hidden content visible.",
    apply: [
      "Extract the alpha channel: `magick image.png -alpha extract alpha.png`.",
      "Open the extracted channel and inspect it directly.",
      "Try viewing over both black and white backgrounds, white-on-transparent text hides on light viewers.",
      "If nothing shows, separate and inspect each individual channel.",
    ],
  },
  "image-difference": {
    explain:
      "When a challenge gives two nearly identical images, the message is the difference between them. Subtracting one from the other cancels the shared content and leaves only what changed, often hidden text or a watermark.",
    apply: [
      "Make sure both images are the same dimensions (resize if `compare` complains).",
      "Composite the difference: `magick a.png b.png -compose difference -composite diff.png`.",
      "Open `diff.png` and look for text or shapes that pop out of the otherwise-black image.",
      "Boost contrast on the difference image if the change is faint.",
    ],
  },
  "pdf-embedded": {
    explain:
      "A PDF is a container of objects: text, images, fonts, attachments, and object streams. A page that looks blank or ordinary can hide content in attachments, layers, or compressed object streams. You extract those parts rather than reading the rendered page.",
    apply: [
      "Inspect structure and metadata with `pdfinfo` and `exiftool`.",
      "Extract embedded images (`pdfimages -all`) and any attachments (`binwalk -e`).",
      "Run `strings | grep` for flag patterns across the raw PDF.",
      "If text seems hidden under a layer, examine the object streams directly.",
    ],
  },
  "office-docx": {
    explain:
      "Modern Office files (`.docx`, `.pptx`, `.xlsx`) are just ZIP archives of XML and media. Flags hide in comments, speaker notes, custom XML, tracked changes, or embedded media, none of which you'd notice opening the file in Word.",
    apply: [
      "List the archive (`unzip -l document.docx`) to see its internal structure.",
      "Unzip it and `grep -R` the XML for flags, comments, and hidden text.",
      "Check `word/media` (or `ppt/media`) for embedded images and identify each with `file`.",
      "Look specifically at comments, notes, and custom XML parts that the app hides by default.",
    ],
  },
  "disk-image": {
    explain:
      "A disk image is a raw copy of a filesystem. The flag is often in a deleted file, slack space, or an OS artifact. The Sleuth Kit walks the partitions and inodes for you and can recover deleted entries without mounting anything.",
    apply: [
      "Find partitions and offsets with `mmls disk.img` (offsets are in sectors).",
      "List files including deleted ones with `fls -r -o <offset>`.",
      "Recover a specific file by inode with `icat -o <offset> disk.img <inode> > out`.",
      "Sweep unallocated space with `strings`/`binwalk` for anything the filesystem dropped.",
    ],
  },
  "memory-volatility": {
    explain:
      "A RAM dump captures everything a machine was doing, processes, command lines, network sockets, and sometimes secrets. Volatility 3 parses the structure, but dumps are large, so you go top-down: OS first, then processes, then the specific artifact the prompt points at.",
    apply: [
      "Identify the OS/profile (`windows.info` or `linux.banners`).",
      "List processes (`pslist`) and command lines (`cmdline`).",
      "Inspect network connections (`netscan`) and dump any suspicious process for deeper analysis.",
      "Run `strings | grep` over the raw dump for fast hits on flags and passwords.",
    ],
  },
  "audio-spectrogram": {
    explain:
      "Sound has a frequency dimension you can't perceive as shapes, but a spectrogram plots frequency over time as an image, and text drawn into that plot becomes readable. Beeps and tones may instead be Morse or DTMF.",
    apply: [
      "Generate a spectrogram: `sox sound.wav -n spectrogram -o spectrogram.png`, then open it.",
      "Look for letters/shapes painted across the frequency axis.",
      "If you hear steady tones, decode Morse by ear or DTMF with `multimon-ng`.",
      "Check metadata too, sometimes the clue is mundane.",
    ],
  },
  "video-frame": {
    explain:
      "A flag or QR code can flash for a single frame that you'll never pause on during playback. Extracting every frame to its own image lets you inspect them one by one, and the subtitle/metadata tracks may carry clues too.",
    apply: [
      "Explode the video into frames: `ffmpeg -i video.mp4 frames/frame_%05d.png`.",
      "Scan the frames folder (grep, or `zbarimg` for QR codes).",
      "Check subtitle and metadata tracks with `ffprobe`/`exiftool`.",
      "Found the frame? Zoom/decode it and treat the contents as the next step.",
    ],
  },
  "browser-artifacts": {
    explain:
      "Browsers and apps persist state in SQLite databases, LevelDB, LocalStorage, and cache files. A challenge that hands you a browser profile or app-data folder wants you to read history, cookies, or stored values out of those stores.",
    apply: [
      "Locate the stores: `find` for `History`, `Cookies`, `Local Storage`, `IndexedDB`.",
      "Query SQLite files with `sqlite3` (e.g. the `urls` table in `History`).",
      "Remember Chrome timestamps are WebKit microseconds since 1601, not Unix seconds.",
      "Grep the whole profile recursively for flag patterns as a quick pass.",
    ],
  },
  "sql-injection": {
    explain:
      "When an app builds a SQL query by concatenating your input, a quote or SQL keyword can change the query's meaning, letting you bypass logins, read other rows, or dump tables. The first probe is a single quote: if it causes an error or a behaviour change, the parameter is injectable.",
    apply: [
      "Send a normal request, then the same request with a `'` appended, and compare responses.",
      "If the response changes/errors, confirm the injection and identify the number of columns.",
      "Use `sqlmap -u '<url>' --batch` to automate detection and extraction on the CTF target.",
      "Dump only the table/row that plausibly holds the flag, don't spray on real systems.",
    ],
  },
  "lfi-path-traversal": {
    explain:
      "If a parameter like `file=`, `page=`, or `path=` is used to read a file from disk, supplying `../` sequences lets you climb out of the intended directory and read arbitrary files, `/etc/passwd` to prove it, then the flag file.",
    apply: [
      "Test the parameter with a known target: `?file=../../../../etc/passwd`.",
      "If filters block raw `../`, try URL-encoding or doubled sequences like `....//`.",
      "Once traversal works, request likely flag paths (`/flag.txt`, app source files).",
      "Fuzz the parameter with an LFI wordlist (`ffuf`) to find readable paths quickly.",
    ],
  },
  ssti: {
    explain:
      "If your input is placed into a server-side template and then rendered, you can inject template syntax that the engine evaluates. The canonical test is `{{7*7}}`, if the response contains `49`, the template engine is executing your input, which can escalate to file reads or RCE.",
    apply: [
      "Inject `{{7*7}}` (and `${7*7}`, `#{7*7}`) and look for `49` in the response.",
      "Fingerprint the engine (Jinja, Twig, Freemarker, Handlebars), payloads differ per engine.",
      "Use engine-specific payloads to read config/files, e.g. `{{config}}` in Jinja.",
      "`tplmap` can automate detection and exploitation once you've confirmed evaluation.",
    ],
  },
  "command-injection": {
    explain:
      "When a web app shells out to a tool (ping, nslookup, convert, git) using your input, shell metacharacters let you append your own command. A different/extra output after `;`, `&&`, or `$(...)` confirms the shell is running what you injected.",
    apply: [
      "Append a separator and a harmless command: `127.0.0.1;id`.",
      "Try several separators, `;`, `&&`, `|`, and `$(...)`, since filters vary.",
      "Once you have execution, read the flag file with a minimal command like `cat /flag.txt`.",
      "If output is blind, you may need a callback, only on challenge infrastructure that allows it.",
    ],
  },
  "file-upload": {
    explain:
      "Upload features try to restrict what you can store, but checks on extension, MIME type, or magic bytes are often incomplete. If you can land an executable file in a web-served path, you get code execution. The art is satisfying the checks while keeping the payload runnable.",
    apply: [
      "Probe what's validated: extension, `Content-Type`, and leading magic bytes, independently.",
      "Craft a file that passes the weak check, e.g. PNG magic bytes followed by PHP code, named `.php.png`.",
      "Find where uploads are stored and request your file to trigger execution.",
      "If uploads don't execute, pivot to path traversal, image-parser bugs, or metadata.",
    ],
  },
  jwt: {
    explain:
      "A JSON Web Token is three base64url parts, header, payload, signature, joined by dots, and they start with `eyJ`. The payload is readable client-side, so an app that trusts a `role`/`admin` claim is vulnerable if you can forge a valid token: via a weak HMAC secret, the `alg:none` trick, or RS256→HS256 key confusion.",
    apply: [
      "Decode the first two parts (base64url) and read the claims.",
      "Spot the authority claim (`admin`, `role`, `user`).",
      "Try the relevant forge: crack a weak HMAC secret, set `alg` to `none`, or do key confusion, only in CTF context.",
      "Replay the forged token and confirm elevated access. Remember: decoding alone isn't exploiting; the signature still matters.",
    ],
  },
  xxe: {
    explain:
      "XML parsers can resolve external entities, references that pull in external content. If an endpoint accepts XML (or SVG) and resolves entities, you can define one that reads a local file and echoes it back, leaking the flag.",
    apply: [
      "Confirm the endpoint parses XML and watch for entity-related errors.",
      "Define a `SYSTEM` entity pointing at a file (`file:///flag.txt`) and reference it in the body.",
      "POST the crafted XML and read the reflected file contents.",
      "If external entities are blocked, try parameter entities or a blind/out-of-band XXE.",
    ],
  },
  ssrf: {
    explain:
      "Server-Side Request Forgery happens when an app fetches a URL you supply (a webhook, image, link preview, importer). You point it at internal resources the server can reach but you can't, `127.0.0.1`, internal hosts, or cloud metadata endpoints.",
    apply: [
      "Find the URL-fetching parameter and point it at `http://127.0.0.1/` to confirm internal access.",
      "Enumerate internal services and admin endpoints (`http://localhost/admin`).",
      "Target the resource that holds the flag (internal API, metadata service), CTF endpoints only.",
      "If filters block the host, try alternate encodings or URL-parser confusion tricks.",
    ],
  },
  idor: {
    explain:
      "Insecure Direct Object Reference: the app exposes object IDs (numeric, username, UUID) and forgets to check whether *you* are allowed to see them. Changing the ID returns someone else's data, including the flag object.",
    apply: [
      "Find a request that references an object by ID and note the pattern.",
      "Change the ID to another value and see if you get a different user's object.",
      "If IDs are sequential, iterate a small range and grep responses for the flag.",
      "Keep request volume low, rate limits can be part of the challenge.",
    ],
  },
  graphql: {
    explain:
      "GraphQL endpoints expose a typed schema, and introspection lets you query that schema to discover every type and field. From there you can query objects the UI never exposed, and authorization is sometimes enforced per-endpoint but not per-field.",
    apply: [
      "Send an introspection query (`{__schema{types{name}}}`) to map the schema.",
      "Identify types/fields that look like flags, users, or admin data.",
      "Query those fields directly, even if the UI never shows them.",
      "Test whether auth is missing on specific fields, `graphqlmap` can help automate.",
    ],
  },
  "prototype-pollution": {
    explain:
      "In JavaScript, objects inherit from a shared prototype. If a Node app merges attacker JSON into an object without guarding `__proto__`/`constructor`, you can write properties onto that shared prototype, flipping flags like `isAdmin` globally, or influencing templates and gadget chains.",
    apply: [
      "Find an endpoint that merges JSON bodies or query objects into config/user objects.",
      "Send a payload polluting the prototype: `{\"__proto__\":{\"isAdmin\":true}}`.",
      "Probe which property the app actually checks (`isAdmin`, `role`, `debug`).",
      "Confirm the polluted property changes behaviour (auth bypass, template change).",
    ],
  },
  "source-leak": {
    explain:
      "Before exploiting anything, look for leaked source, exposed `.git`, `.env`, backup files, or source maps. Source tells you exact routes, secrets, and the flag's location, turning a blind challenge into a transparent one.",
    apply: [
      "Curl the usual suspects: `robots.txt`, `.env`, `.git/HEAD`, `.bak`/`~` backups.",
      "If `.git` is exposed, mirror it (`wget -r .../.git/`) and reconstruct the repo.",
      "Grep the recovered files for secrets, credentials, and flag paths.",
      "Note that source maps reveal frontend source but rarely backend secrets.",
    ],
  },
  "classic-ciphers": {
    explain:
      "Letters-only ciphertext with a wordplay-ish or historical theme is usually a classical cipher, Caesar/ROT (a fixed shift), Atbash (alphabet reversed), or Vigenère (a keyword shift). These are cheap to brute-force or solve before reaching for modern crypto.",
    apply: [
      "Try all 26 Caesar shifts and eyeball the output for readable English.",
      "If no shift works, test Atbash and then Vigenère with likely keywords.",
      "Confirm the alphabet: only letters → classical; digits/symbols/`=` → it's probably an encoding instead.",
      "Once readable, the flag usually falls out directly.",
    ],
  },
  xor: {
    explain:
      "XOR is reversible: `cipher ⊕ key = plain` and `cipher ⊕ plain = key`. Single-byte XOR has only 256 possible keys, so you brute-force it. Repeating-key XOR needs you to find the key length (e.g. via Hamming distance) or exploit known plaintext like a file's magic bytes.",
    apply: [
      "For single-byte XOR, try all 256 keys and flag the output containing `flag{`/`picoCTF{`.",
      "For repeating-key XOR, estimate the key size, then solve each key byte as its own single-byte problem.",
      "If you know part of the plaintext (e.g. magic bytes), XOR it against the ciphertext to recover key bytes.",
      "If the result looks compressed/encrypted, you may be one layer too early, re-examine.",
    ],
  },
  "rsa-given-pq": {
    explain:
      "RSA's security rests on `n` being hard to factor. If the challenge already gives you `p` and `q` (or `phi`), it's broken: compute `phi=(p-1)(q-1)`, derive the private exponent `d = e⁻¹ mod phi`, and decrypt `c`.",
    apply: [
      "Parse `n`, `e`, `c`, and the provided `p`, `q` (or `phi`).",
      "Compute `phi = (p-1)*(q-1)` and `d = pow(e, -1, phi)`.",
      "Recover the message: `m = pow(c, d, n)`, then convert the integer to bytes.",
      "If the bytes are garbage, double-check you parsed the numbers (and base) correctly.",
    ],
  },
  "rsa-small-e": {
    explain:
      "When the public exponent `e` is tiny (3 or 5) and the message isn't padded, encryption is just `m^e mod n`. If `m^e` is smaller than `n`, no modular wrap happens, so the plaintext is simply the integer e-th root of the ciphertext.",
    apply: [
      "Take the exact e-th root of `c` (e.g. `gmpy2.iroot(c, 3)`).",
      "If the root is exact, convert the integer to bytes for the flag.",
      "If it isn't exact, `m^e` exceeded `n`, look for a broadcast/CRT (Håstad) setup across multiple moduli.",
      "Confirm there's genuinely no padding before assuming this attack applies.",
    ],
  },
  "rsa-shared-prime": {
    explain:
      "If two RSA moduli were generated with a bad RNG, they may share a prime factor. The GCD of two such moduli is that shared prime, and dividing it out factors both keys instantly, no heavy factoring required.",
    apply: [
      "Collect every modulus the challenge provides.",
      "Compute pairwise GCDs across all of them (not just adjacent pairs).",
      "Any GCD strictly between 1 and n is a shared prime, divide to get both factors.",
      "With `p` and `q` known, finish as in the standard 'p and q given' attack.",
    ],
  },
  "padding-oracle": {
    explain:
      "If a server decrypts your ciphertext and reveals, through different errors, timings, or status codes, whether the PKCS#7 padding was valid, that single bit of feedback lets you recover plaintext one byte at a time without the key. It's slow but deterministic.",
    apply: [
      "Confirm the oracle: tamper with a ciphertext block and check that 'bad padding' is distinguishable from other errors.",
      "Attack block by block, byte by byte, using the padding feedback to solve each intermediate byte.",
      "Use `padbuster` or a scripted oracle to automate the byte recovery.",
      "Normalise network noise with retries and compare response length/status, not just the message.",
    ],
  },
  "hash-crack": {
    explain:
      "A fixed-length hex/base64 string that you're asked to 'reverse' is a hash, you can't invert it, but you can guess inputs, hash them, and compare. Identify the algorithm first so you pick the right cracking mode.",
    apply: [
      "Identify the hash type with `hashid`/`hash-identifier`.",
      "Try challenge-specific guesses and small wordlists before the giant ones.",
      "Run `john` or `hashcat -m <mode>` with `rockyou.txt`.",
      "For salted hashes, get the input format exactly right or cracking silently fails.",
    ],
  },
  "prng-seed": {
    explain:
      "Non-cryptographic random generators (Python's `random`/MT19937, C's `rand`, LCGs) are deterministic given their seed. If tokens are derived from the current time or a small seed space, you can replay generation and predict or reproduce the value.",
    apply: [
      "Identify the generator and what seeds it (time, PID, a counter).",
      "If time-seeded, brute-force seeds across a plausible window and regenerate the token.",
      "For MT19937, enough consecutive outputs let you reconstruct the internal state and predict the next.",
      "If it uses `secrets`/`os.urandom`, this won't work, it's cryptographically secure.",
    ],
  },
  ret2win: {
    explain:
      "The simplest overflow: the binary already contains a function (`win`, `print_flag`, `give_shell`) that does what you want, and an unsafe input lets you overwrite the saved return address. You just redirect execution to that function's address.",
    apply: [
      "Find the target function's address (`nm`/`objdump`, or pwntools `elf.symbols`).",
      "Determine the offset from your input to the saved return address with a cyclic pattern.",
      "Build a payload of `offset` bytes of padding followed by the function address.",
      "On 64-bit, add a bare `ret` gadget before the target to fix stack alignment if it crashes.",
    ],
  },
  "format-string": {
    explain:
      "When user input is passed straight into `printf`-style functions as the format string, conversion specifiers act on the stack: `%p` leaks memory (addresses, canaries, libc), and `%n` writes a value to an address. It's both an info-leak and an arbitrary-write primitive.",
    apply: [
      "Send `%p` repeated (or `%N$p`) and find which argument offset leaks your controlled input.",
      "Use leaks to defeat ASLR/canaries by recovering addresses and the stack cookie.",
      "When you need to write, use `%n` with carefully sized output to set memory values.",
      "Establish the correct argument offset before building any write, it anchors everything.",
    ],
  },
  ret2libc: {
    explain:
      "With NX enabled you can't run shellcode on the stack, but you can chain existing code. ret2libc redirects execution into libc, leak a libc address to compute its base, then call `system(\"/bin/sh\")` or print the flag.",
    apply: [
      "Find useful gadgets (`pop rdi; ret`) and a function to leak a libc address (e.g. `puts(puts@got)`).",
      "Leak an address, subtract its known offset to compute the libc base.",
      "Compute `system` and `\"/bin/sh\"` addresses from the base and build the ROP chain.",
      "Match the remote libc exactly (use the provided libc or leak enough symbols to fingerprint it).",
    ],
  },
  "heap-tcache": {
    explain:
      "Modern glibc caches freed chunks in per-size tcache bins as a singly linked list. A double-free or use-after-free lets you corrupt that list's forward pointer so a future allocation returns an attacker-chosen address, which you point at a hook, GOT entry, or function pointer.",
    apply: [
      "Map the menu: what sizes it allocates/frees and where the double-free/UAF is.",
      "Get a leak (heap and/or libc), you usually need addresses before poisoning.",
      "Poison the tcache fd pointer so the next malloc returns your target address.",
      "Mind the glibc version, safe-linking (2.32+) changes how the fd pointer is mangled.",
    ],
  },
  "strings-password": {
    explain:
      "Many beginner crackmes compare your input against a literal string stored in the binary. The fastest path is static: dump the strings and look for the password, or trace the comparison call to see what it expects.",
    apply: [
      "Run `strings -a ./crackme | grep -iE 'flag|pass|correct|key'` and try anything that looks like a password.",
      "If nothing obvious, `ltrace` the binary to catch `strcmp`/`memcmp` arguments at runtime.",
      "If the flag is built at runtime, open it in `gdb`/Ghidra and read the construction logic.",
      "Reimplement or short-circuit the check if the comparison is computed rather than literal.",
    ],
  },
  "xor-reverse": {
    explain:
      "A common obfuscation stores strings encrypted and decrypts them at runtime with a small loop (XOR/add/sub against a constant or key). Recover the constants and the loop from the disassembly, then replicate it in Python to recover the plaintext.",
    apply: [
      "Locate the encrypted byte array and the decode loop (`objdump`/Ghidra).",
      "Note the operation and key/constant used per iteration.",
      "Reimplement the loop in Python over the extracted bytes.",
      "Watch for signed-char behaviour and exact loop bounds when porting.",
    ],
  },
  "android-apk": {
    explain:
      "An APK is a ZIP of resources plus compiled Dalvik bytecode (and sometimes native `.so` libraries). Decompiling the bytecode back to readable Java/Kotlin reveals validation logic and secrets, but check assets and native libs too, since secrets aren't always in the Java.",
    apply: [
      "Open it in `jadx` for readable Java/Kotlin; use `apktool` for resources and smali.",
      "Grep the decompiled tree for `flag`, `secret`, `password`, and API keys.",
      "Inspect native `.so` files with `strings` if the Java side is clean.",
      "Follow the code path that checks the flag to its source.",
    ],
  },
  pyinstaller: {
    explain:
      "PyInstaller bundles a Python program into a single executable that contains the compiled `.pyc` bytecode. Extract the archive, then decompile the bytecode back to source to read the logic.",
    apply: [
      "Confirm it's PyInstaller (`strings` shows PyInstaller markers).",
      "Extract the bundle with `pyinstxtractor.py`.",
      "Locate the main `.pyc` and decompile it (`uncompyle6`, `decompyle3`, or `pycdc`).",
      "If decompilation fails, the Python version may mismatch, try a different decompiler.",
    ],
  },
  wasm: {
    explain:
      "WebAssembly is a compact binary instruction format that runs in the browser. Converting `.wasm` to its text form (`.wat`) makes the logic readable, where you can find the exported validation function and any hardcoded constants.",
    apply: [
      "Convert to text: `wasm2wat chall.wasm -o chall.wat`.",
      "Grep for readable strings and locate exported functions that validate input.",
      "Read the validation logic (or use `wasm-decompile` for a higher-level view).",
      "Remember the JS wrapper may transform your input before it reaches the WASM.",
    ],
  },
  "http-pcap": {
    explain:
      "HTTP traffic in a capture is largely plaintext: requests, responses, headers, cookies, form posts, and downloaded files. Following the HTTP streams and carving transferred files usually surfaces the flag directly.",
    apply: [
      "Filter HTTP and read requests/responses: `tshark -r capture.pcap -Y http`.",
      "Pull transferred bodies/files (`http.file_data`, or Wireshark 'Export Objects').",
      "Carve embedded files with `foremost` and identify them.",
      "Grep the raw pcap for flag patterns, cookies, and auth headers.",
    ],
  },
  "dns-exfil": {
    explain:
      "Data can be smuggled out as DNS queries: each long, random-looking subdomain label is a chunk of encoded data. Collect the query names in order, join the labels, and decode (hex/base32/base64).",
    apply: [
      "Extract all query names: `tshark -r capture.pcap -Y dns -T fields -e dns.qry.name`.",
      "Take the leftmost label of each query and concatenate in capture order.",
      "Decode the joined string (try hex, then base32, then base64).",
      "Watch for duplicate queries (DNS retries) that would corrupt the order.",
    ],
  },
  "usb-keyboard": {
    explain:
      "USB HID keyboard traffic carries key-press reports, each containing scancodes (and modifier bits like Shift). Decoding the capdata back into characters reconstructs what was typed, often the flag.",
    apply: [
      "Extract the HID data: `tshark -r usb.pcap -Y 'usb.capdata' -T fields -e usb.capdata`.",
      "Map each report's scancode to a character, honouring the Shift modifier.",
      "Use a known HID-decode script to turn the byte stream into text.",
      "If `usb.capdata` is empty, try `usbhid.data` or raw URB bytes, field names vary by capture.",
    ],
  },
  "ftp-smtp": {
    explain:
      "Legacy protocols like FTP and SMTP transmit credentials, commands, and file contents in the clear. A capture containing them often hands you usernames, passwords, emails, and attachments verbatim.",
    apply: [
      "Filter for the protocol: `tshark -r capture.pcap -Y ftp` (or `smtp`).",
      "Read `USER`/`PASS` and the command sequence.",
      "Reassemble transferred files/emails with `tcpflow` and identify them.",
      "For FTP, remember data transfers use a separate stream from the control channel.",
    ],
  },
  "ssh-auth-log": {
    explain:
      "Linux auth logs record every login attempt. A brute-force shows as many `Failed password` lines from one IP, eventually followed by an `Accepted password`. The story is: which IP, which account, when it succeeded, and what happened next.",
    apply: [
      "Count failed attempts per source to find the attacker IP.",
      "Find the `Accepted password` line, that's the moment of compromise.",
      "Trace post-login activity: `sudo`, `session opened`, executed commands.",
      "Mind timezones when correlating with other logs.",
    ],
  },
  "web-access-log": {
    explain:
      "Web server access logs capture every request. Attacks stand out as unusual paths, encoded payloads, 500s, or hits on upload/admin endpoints. You isolate the anomalous client and reconstruct the request sequence that led to a shell or the flag.",
    apply: [
      "Summarise requests per IP to spot the odd actor.",
      "Grep for attack signatures: `union`, `select`, `../`, `cmd=`, `upload`, `shell`.",
      "URL-decode suspicious paths before judging them.",
      "Reconstruct the ordered sequence of the attacker's requests to find the payoff.",
    ],
  },
  "base-encoding": {
    explain:
      "Encodings (base64, hex, URL-encoding, HTML entities) are reversible representations, not encryption, and challenges often stack them. The discipline is decoding one layer at a time and checking whether the result is yet another encoding.",
    apply: [
      "Identify the outermost layer from its alphabet (`=` padding → base64, `%7B` → URL, long hex → hex).",
      "Decode exactly one layer.",
      "Inspect the output and repeat if it looks encoded again.",
      "Don't assume base64 just because of `=`, verify each result actually decodes to something sensible.",
    ],
  },
  "qr-barcode": {
    explain:
      "A visible (or distorted) code in an image is meant to be scanned. If a direct decode fails, the image usually needs cleanup, scaling, cropping, contrast, or colour inversion, before a reader can lock onto it.",
    apply: [
      "Try a direct decode first: `zbarimg code.png`.",
      "If it fails, upscale with nearest-neighbour, crop tightly to the code, and boost contrast.",
      "Try inverting colours, some codes are light-on-dark.",
      "Re-run the decoder after each cleanup step.",
    ],
  },
  "git-history": {
    explain:
      "Git keeps everything ever committed. A secret deleted from the working tree still lives in old commits, other branches, tags, stashes, the reflog, or as dangling blobs. Searching only the current files misses all of it.",
    apply: [
      "Review all history graph-wide: `git log --oneline --all --decorate --graph`.",
      "Search every commit at once: `git grep <pattern> $(git rev-list --all)`.",
      "Check stashes, tags, and the reflog for commits no branch references.",
      "Recover unreachable objects with `git fsck --lost-found`, then `git show` them.",
    ],
  },
  "zero-width": {
    explain:
      "Zero-width Unicode characters (U+200B, U+200C, U+FEFF, etc.) render as nothing but are real bytes in the file. Authors use them to encode bits or hide delimiters in otherwise-normal text, the giveaway is text whose copied length is larger than it looks.",
    apply: [
      "Print the code points of every non-ASCII character in the text.",
      "Identify which zero-width variants appear and how many.",
      "Map the two (or more) variants to binary `0`/`1` and group into bytes.",
      "Decode the resulting bytes into the message.",
    ],
  },
  "whitespace-stego": {
    explain:
      "Trailing spaces and tabs are invisible in most editors but are distinct characters. Whitespace steganography encodes bits as space-vs-tab (or counts of them), so making whitespace visible reveals a binary message.",
    apply: [
      "Make whitespace visible (`sed -n l`, or `cat -A`).",
      "Extract the run of spaces/tabs and map space→0, tab→1 (or by count).",
      "Group the bits into bytes and decode.",
      "Tools like `stegsnow` automate the common SNOW encoding.",
    ],
  },
  "ansi-escape": {
    explain:
      "Terminal text can contain ANSI escape sequences that colour, move, or overwrite characters. These can hide text (by colouring it invisibly) or overwrite visible content, so viewing the raw control codes reveals what's really there.",
    apply: [
      "View raw control characters with `cat -v`.",
      "Strip the escape sequences with a sed regex to see the underlying text.",
      "Compare stripped vs rendered output, hidden/overwritten text shows up.",
      "Grep the cleaned text for the flag.",
    ],
  },
  protobuf: {
    explain:
      "Protocol Buffers is a compact binary serialization format with no self-describing field names, just numbered fields and wire types (lots of varints). `protoc --decode_raw` parses the structure without needing the `.proto` schema.",
    apply: [
      "Recognise it: small numbered fields, repeated varint-like structure in the hex.",
      "Decode without a schema: `protoc --decode_raw < message.bin`.",
      "Read the field values for the flag or further-encoded data.",
      "Cross-check with `strings` for readable fragments.",
    ],
  },
  "bmp-padding": {
    explain:
      "BMP pixel rows are padded so each row's length is a multiple of 4 bytes. Those padding bytes are ignored by viewers, making them a quiet place to hide data based on the image width and colour depth.",
    apply: [
      "Determine width and bit depth to compute each row's real length and its padding size.",
      "Walk the pixel data and collect the padding bytes after each row.",
      "Assemble the collected bytes and inspect them for a message.",
      "Confirm the image is genuinely BMP with `file` first.",
    ],
  },
  "png-chunks": {
    explain:
      "A PNG is a sequence of typed chunks. Beyond the standard ones, authors add non-standard ancillary chunks (or reorder/oversize them) to smuggle text or compressed data that a normal viewer ignores.",
    apply: [
      "Dump the chunk list verbosely with `pngcheck -v image.png`.",
      "Look for unknown/oddly-named ancillary chunks or suspicious sizes.",
      "Extract the contents of suspicious chunks and inspect/decompress them.",
      "Also run `exiftool`/`strings` for text in standard text chunks.",
    ],
  },
  "palette-image": {
    explain:
      "Indexed (palette) images store pixels as indices into a colour table. Data can be hidden in the palette's ordering or in unused palette entries rather than in the pixels you see.",
    apply: [
      "Confirm indexed mode and read the palette (`pngcheck -v`, or PIL `getpalette()`).",
      "Look at the palette ordering and any unused/odd entries.",
      "Dump pixel indices (`magick image.png txt:-`) and look for patterns.",
      "Decode whatever ordering/index scheme encodes the message.",
    ],
  },
  "file-chunks": {
    explain:
      "When a folder holds many numbered parts, they're fragments of one file split apart. Concatenating them in the correct (natural) order reassembles the original, which you then identify.",
    apply: [
      "List parts in natural order (`ls -v`) to get the sequence right.",
      "Concatenate them: `cat part* > joined.bin`.",
      "Identify the result with `file` and `binwalk`.",
      "Triage the reassembled file as a fresh artifact.",
    ],
  },
  "ntfs-ads": {
    explain:
      "NTFS files can carry named Alternate Data Streams, extra hidden streams attached to a file that don't show in normal directory listings. Forensic tools can enumerate and extract them.",
    apply: [
      "Enumerate files and their streams with `fls -r` on the NTFS image.",
      "Extract a named stream by inode with `icat 'image' '<inode>:<stream>'`.",
      "List the image with `7z l` as a cross-check for hidden streams.",
      "Identify the extracted stream's contents.",
    ],
  },
  "sqlite-deleted": {
    explain:
      "SQLite doesn't always zero out deleted rows, the old data can linger in freed pages. Beyond normal queries, `.recover` and raw `strings` can surface deleted records.",
    apply: [
      "Inspect the schema: `sqlite3 app.db '.tables'` and `sqlite_master`.",
      "Query the live tables for obvious data.",
      "Run `.recover` to rebuild content from freed pages.",
      "Grep the raw DB file with `strings` for deleted text the engine no longer indexes.",
    ],
  },
  "xss-admin-bot": {
    explain:
      "When your input is rendered on a page that a bot/admin visits, stored or reflected XSS lets your script run in their session. You confirm script execution, then read accessible page state or send data to an allowed callback.",
    apply: [
      "Confirm injection: get a benign script (`alert(1)`) to execute where the bot will see it.",
      "Identify what you need from the admin context (cookie, page content, an admin-only value).",
      "Exfiltrate it to a challenge-approved callback you control.",
      "Keep payloads within the rules of the challenge infrastructure.",
    ],
  },
  csrf: {
    explain:
      "If a state-changing endpoint relies on cookie auth and has no anti-CSRF token, a request forged from elsewhere still carries the victim's cookies and succeeds. That lets you trigger privileged actions on their behalf.",
    apply: [
      "Find a state-changing request that uses cookie auth and lacks a CSRF token.",
      "Reproduce it with the victim's cookies (or as the target action expects).",
      "Confirm the action took effect (role change, setting flip).",
      "If the endpoint needs a specific content type, match it exactly.",
    ],
  },
  cors: {
    explain:
      "A misconfigured CORS policy that reflects an arbitrary `Origin` and allows credentials lets a malicious site read authenticated responses cross-origin, leaking protected data.",
    apply: [
      "Send a request with a crafted `Origin` header and inspect the response CORS headers.",
      "Check whether `Access-Control-Allow-Origin` reflects your origin and `Allow-Credentials` is true.",
      "If so, demonstrate cross-origin reads of the protected resource.",
      "The flag is usually in the data that becomes readable.",
    ],
  },
  nosql: {
    explain:
      "NoSQL backends like MongoDB accept query operators. If an app passes unsanitised JSON into a query, operators like `$ne` or `$regex` change the query's logic, e.g. matching any user/password to bypass login.",
    apply: [
      "Confirm the endpoint takes JSON and likely talks to MongoDB.",
      "Send operator payloads such as `{\"user\":{\"$ne\":null},\"pass\":{\"$ne\":null}}`.",
      "Use `$regex`/`$gt` to extract data character by character if needed.",
      "Watch the response change to confirm the operator altered the query.",
    ],
  },
  deserialization: {
    explain:
      "When an app deserialises attacker-controlled data (Python pickle, Java/PHP serialized objects), crafted objects can trigger code execution via 'gadget chains' in the available libraries. The tell is serialized-object markers in cookies or bodies.",
    apply: [
      "Identify the format from its markers (base64 of pickle, Java `AC ED`, PHP `O:`).",
      "Determine the framework and which gadget libraries are present.",
      "Generate a payload (e.g. `ysoserial` for Java) targeting an available gadget.",
      "Deliver it where the app deserialises and confirm execution.",
    ],
  },
  "php-type-juggling": {
    explain:
      "PHP's loose comparison (`==`) coerces types, so strings like `'0e123'` are treated as the number 0, making different 'magic hash' strings compare as equal. Code that compares hashes/tokens with `==` is vulnerable.",
    apply: [
      "Find a loose comparison (`==`) on a hash or token in the source.",
      "Supply a value that juggles to match (e.g. a `0e...` magic hash that hashes to `0e...`).",
      "Confirm the comparison passes where a strict `===` would fail.",
      "Use the bypass to authenticate or reach the protected path.",
    ],
  },
  "request-smuggling": {
    explain:
      "When a front-end proxy and back-end server disagree about where one HTTP request ends (conflicting `Content-Length` vs `Transfer-Encoding`), you can smuggle a second request past the proxy, poisoning other users' requests or reaching internal routes.",
    apply: [
      "Probe for CL.TE / TE.CL desync between the front-end and back-end.",
      "Use a tool like `smuggler.py` to detect the disagreement.",
      "Craft a smuggled prefix that reaches a restricted route or poisons a victim request.",
      "Confirm the desync by observing the smuggled request's effect.",
    ],
  },
  "oauth-redirect": {
    explain:
      "OAuth flows hand tokens to a `redirect_uri`. If the server validates that URI loosely, you can redirect the token to a server you control, via subdomain confusion, path tricks, or an open redirect, and steal the authorization.",
    apply: [
      "Inspect the login flow for `redirect_uri` and `state` parameters.",
      "Test redirect bypasses: attacker domain, subdomain confusion, path traversal, open redirect.",
      "If a bypass works, capture the token/code delivered to your endpoint.",
      "Use the captured credential to access the protected account.",
    ],
  },
  "aes-ecb": {
    explain:
      "ECB mode encrypts each 16-byte block independently, so identical plaintext blocks produce identical ciphertext blocks. That repetition leaks structure (the famous 'ECB penguin') and enables byte-at-a-time decryption when you can prepend chosen plaintext.",
    apply: [
      "Split the ciphertext into 16-byte blocks and count repeats, repeats confirm ECB.",
      "If you control prepended input, align secret bytes to block boundaries and recover them one at a time.",
      "Compare blocks across inputs to map structure.",
      "Reconstruct the secret from the recovered blocks.",
    ],
  },
  "cbc-bitflip": {
    explain:
      "In CBC, each plaintext block is XORed with the previous ciphertext block during decryption. Flipping a bit in ciphertext block N flips the corresponding bit in plaintext block N+1 (while garbling block N), letting you forge controlled plaintext like `admin=true`.",
    apply: [
      "Identify the structured field you want to change and which plaintext block it lands in.",
      "Compute the XOR difference between current and desired bytes.",
      "Apply that XOR to the matching bytes of the previous ciphertext block.",
      "Submit the modified ciphertext and accept the garbled prior block as collateral.",
    ],
  },
  "ctr-nonce-reuse": {
    explain:
      "CTR mode turns a block cipher into a stream cipher by encrypting a counter to make keystream. Reusing the same key+nonce produces the same keystream, so XORing two ciphertexts cancels the keystream and leaves `plaintext1 ⊕ plaintext2`.",
    apply: [
      "Confirm two ciphertexts share the same key/nonce.",
      "XOR the two ciphertexts together to get the XOR of their plaintexts.",
      "Use crib-dragging (guessing likely words) to peel apart the two plaintexts.",
      "Recover the flag from whichever plaintext contains it.",
    ],
  },
  "length-extension": {
    explain:
      "Merkle Damgård hashes (MD5, SHA-1, SHA-256) let you continue hashing from a known digest. If a MAC is built as `hash(secret || message)`, you can append data and compute a valid MAC for the extended message without knowing the secret.",
    apply: [
      "Recognise the vulnerable construction: `hash(secret || message)` used as a MAC.",
      "Estimate the secret length (or brute-force it).",
      "Use `hashpump` to append your data and produce the new valid digest.",
      "Submit the extended message + forged MAC.",
    ],
  },
  "ecdsa-nonce": {
    explain:
      "ECDSA signatures use a per-signature random nonce `k`. If two signatures reuse the same `k`, they share the same `r` value, and the math then directly recovers `k` and the long-term private key.",
    apply: [
      "Scan the signatures for a repeated `r` value (the reuse tell).",
      "Compute `k = (h1 - h2) / (s1 - s2) mod n` from the two signatures.",
      "Recover the private key from `k` and either signature.",
      "Sign your own message or decrypt as the challenge requires.",
    ],
  },
  shamir: {
    explain:
      "Shamir's Secret Sharing splits a secret into points on a polynomial; the secret is the polynomial's value at x=0. Given at least `threshold` shares (x, y), Lagrange interpolation over the field reconstructs f(0).",
    apply: [
      "Collect enough shares to meet the threshold.",
      "Interpolate the polynomial through the points over the correct finite field.",
      "Evaluate at x=0 to recover the secret.",
      "Convert the secret integer to bytes if it's a flag string.",
    ],
  },
  srop: {
    explain:
      "Sigreturn-Oriented Programming abuses the `sigreturn` syscall, which restores all registers from a frame on the stack. If you can call `sigreturn` and control the stack, you set every register at once, powerful when normal ROP gadgets are scarce.",
    apply: [
      "Find a `syscall`/`sigreturn` gadget in the binary.",
      "Build a fake signal frame (pwntools `SigreturnFrame`) with the register values you want.",
      "Trigger `sigreturn` so the kernel loads your frame.",
      "Use the controlled registers to perform a syscall (e.g. `execve(\"/bin/sh\")`).",
    ],
  },
  "stack-canary": {
    explain:
      "A stack canary is a secret value placed before the saved return address; the function aborts if it's been overwritten. To exploit an overflow you must leak the canary and include its exact value in your payload so the check passes.",
    apply: [
      "Confirm a canary is present with `checksec`.",
      "Leak it via a format string or an over-read, or brute-force it byte-by-byte on a forking server.",
      "Place the recovered canary at its correct offset in your payload.",
      "Continue overwriting past it to control the return address.",
    ],
  },
  "pie-aslr": {
    explain:
      "With PIE/ASLR, the binary and libraries load at randomised base addresses each run, so hardcoded addresses fail. But any leaked pointer to a known symbol lets you compute the base, after which every address is recoverable.",
    apply: [
      "Obtain a leak of any pointer to a known location (function, return address).",
      "Compute the base: `base = leaked_address - known_offset`.",
      "Rebase the addresses you need (gadgets, functions) off that base.",
      "Build the exploit using the now-known addresses.",
    ],
  },
  seccomp: {
    explain:
      "A seccomp filter restricts which syscalls a process may make, often blocking `execve` so you can't just pop a shell. The workaround is an open-read-write (ORW) ROP chain that opens the flag file, reads it, and writes it to stdout.",
    apply: [
      "Dump the filter with `seccomp-tools dump ./vuln` to see what's allowed.",
      "If `execve` is blocked but `open`/`read`/`write` aren't, plan an ORW chain.",
      "Gather gadgets and build the chain to open the flag file and print its contents.",
      "Adjust syscalls to whatever the filter actually permits.",
    ],
  },
  "angr-constraints": {
    explain:
      "When a checker is pure logic, lots of arithmetic/bitwise constraints on the input, symbolic execution can solve it for you. angr explores paths with a symbolic input and asks a solver (Z3) for input that reaches the 'success' state.",
    apply: [
      "Model stdin/argv as a symbolic value of the right length.",
      "Identify the address of the success branch (and the failure addresses to avoid).",
      "Run angr's explorer to find a path to success.",
      "Read the concretised input the solver produces, that's the flag/password.",
    ],
  },
  "upx-packed": {
    explain:
      "UPX compresses an executable and unpacks it at runtime, so a static disassembler sees only the packed stub and sparse strings. Unpacking restores the real code for analysis.",
    apply: [
      "Confirm packing: `strings` shows `UPX` markers.",
      "Unpack with `upx -d chall -o unpacked`.",
      "Verify with `file`, then analyse the unpacked binary normally.",
      "If UPX refuses (tampered headers), repair them or unpack manually via a debugger.",
    ],
  },
  dotnet: {
    explain:
      ".NET executables contain CIL bytecode plus rich metadata, so they decompile back to near-original C# cleanly. Tools like ILSpy/dnSpy reveal validation methods and embedded resources.",
    apply: [
      "Confirm it's managed .NET with `file`.",
      "Decompile with `ilspycmd` (or open in dnSpy) to read the C#.",
      "Inspect the methods that validate the flag and any embedded resources.",
      "Check `strings` for flags stored as literals or resources.",
    ],
  },
  "go-binary": {
    explain:
      "Go produces large, statically-linked binaries full of runtime noise, but they retain build info and recoverable function names. You start from strings and function-name recovery rather than expecting clean decompilation.",
    apply: [
      "Confirm Go: `strings` shows `go build` / `Go build ID`.",
      "Recover function names with `go tool nm` or a Go-aware analyzer.",
      "Filter the symbol/string noise to find the validation routine.",
      "Read or reimplement the check.",
    ],
  },
  "irc-chat": {
    explain:
      "IRC and similar chat protocols are plaintext. A capture containing them can be reassembled into the conversation, where the flag is often just said in a message.",
    apply: [
      "Filter for the chat protocol (`tshark -Y irc`).",
      "Reassemble the TCP streams with `tcpflow` to read full conversations.",
      "Read the messages for the flag.",
      "Grep the reassembled output for flag patterns.",
    ],
  },
  "icmp-data": {
    explain:
      "ICMP echo (ping) packets have a payload field that normally holds filler bytes. Attackers stuff exfiltrated data there, so unusual payload sizes signal a covert channel.",
    apply: [
      "Extract ICMP payloads: `tshark -Y icmp -T fields -e data.data`.",
      "Concatenate them in order and convert from hex.",
      "Inspect the result, it may be plaintext or a further-encoded blob.",
      "Note unusual payload sizes as the tell that data is hidden there.",
    ],
  },
  "tcp-flags": {
    explain:
      "Covert channels can encode bits in metadata rather than payload, TCP flag combinations, port choices, packet lengths, or inter-packet timing. Patterned-looking flags/timing are the clue.",
    apply: [
      "Extract the suspect field (e.g. `tcp.flags`, or `frame.time_epoch` for timing).",
      "Map the values to bits per a plausible scheme (flag present = 1, etc.).",
      "Assemble the bits into bytes and decode.",
      "Try several encodings if the first mapping yields garbage.",
    ],
  },
  "voip-rtp": {
    explain:
      "VoIP calls ride on SIP (signalling) and RTP (audio) packets. Extracting the RTP stream reconstructs the call audio, which you then listen to or run through audio analysis.",
    apply: [
      "Identify the RTP streams (`tshark -Y rtp`, or Wireshark's Telephony menu).",
      "Extract/decode the RTP payload to an audio file (`rtpbreak`, or Wireshark export).",
      "Listen to the recovered audio.",
      "If the audio hides data, run it through the spectrogram/Morse playbook.",
    ],
  },
  "windows-events": {
    explain:
      "Windows Event Logs (.evtx) record logons, process creation, PowerShell activity, and more, each with an Event ID. Correlating IDs like 4624 (logon) and 4688 (process created) reconstructs attacker activity.",
    apply: [
      "Convert the logs to text (`evtx_dump.py Security.evtx`).",
      "Grep for key Event IDs (4624 logon, 4688 process create) and keywords like `powershell`.",
      "Correlate logon → process creation → persistence to build the timeline.",
      "Pull the flag from the relevant event's details.",
    ],
  },
  powershell: {
    explain:
      "PowerShell's `-EncodedCommand` takes a base64 string of UTF-16LE text. Logs full of long base64 blobs are encoded commands you decode to reveal what actually ran.",
    apply: [
      "Find the `-EncodedCommand` value or long base64 blob in the logs.",
      "Base64-decode it, then decode the bytes as UTF-16LE.",
      "Read the recovered script for intent and indicators.",
      "Follow any URLs or dropped files the script references.",
    ],
  },
  "cron-persistence": {
    explain:
      "Attackers use scheduled jobs (cron) for persistence, a recurring command that re-establishes access or rewrites the flag. Cron files and syslog CRON entries reveal these jobs.",
    apply: [
      "Search cron locations for suspicious commands: `grep -RniE 'curl|wget|bash|sh' /etc/cron*` and user crontabs.",
      "Check `/var/log/syslog` for `CRON` execution entries.",
      "Identify the recurring command and what it does.",
      "Trace it to the persistence mechanism or the flag it writes.",
    ],
  },
  cloudtrail: {
    explain:
      "AWS CloudTrail logs every API call as JSON, who did what, when, and from where. A compromise shows as a sequence: credential creation, role assumption, then access to storage. You order events by time and follow the principal.",
    apply: [
      "Flatten the events with `jq` (time, event name, principal ARN, source IP).",
      "Grep for escalation/exfil events: `CreateAccessKey`, `AssumeRole`, `GetObject`, `PutBucket`.",
      "Sort by time and follow a single principal's actions.",
      "The flag is usually the object accessed or a value in the call parameters.",
    ],
  },
};
