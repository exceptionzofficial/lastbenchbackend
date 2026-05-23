import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = {
  type: "service_account",
  project_id: "for-lastbench",
  private_key_id: "0045637f49c6db9bd2e3ba7e72645eff315ab737",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDtr/vK5Yb9iaZA\nf3GZlDvBxQJhKYW/DW8P0xjoTN0zluc2+kLr9qYDKzyxENMgxULLC5yINx+dq9kh\njWf8vuqwkEm+qBBM/tgPocjRMtjRE6bxMlNzGmBevVK7TJoVk6HVxOO1nMNGsLaR\nmqLd8hBFx7v7+ZkcgD7TC4VeuJAaQ2PZRFfY5/etG6dKo5rCzYyqzVKk2RWmo4c9\nm+PoTTHScrZWMhgwswUsiJYKtf+7aEesYqj2Hc4FKK8rK5Ip2XsE19doTnIO5DvK\nLUJ4F5TQmi6Hw1Jt8/WTuPcRTH0DjEJbEM25NdRa4l9kUSIYfbW/hFJEwkaUvnhk\nZbPRpI7VAgMBAAECggEATld/9Xs7yBtzmbSn28f4/kASLbZC6BrkbWHVxtN24Ucu\nxHcuUZoFU+wPYAk8nYOHJWeZW2hX2l9G/QEfsjW3IyUbuWSposcordZUW2eYASmq\nD7vXt4uNEgzy1NtFujDj2ZLAvx6BWq5qLom6fs8HQAi6VC4LolI+4s7cUcEhdhX3\ngr72jJ3yPUOCoKCFEinwhNYv+ADcL4EaQQ6NtmN5iuJCAzWThlu7+2Qcz/e5qOZ/\nzYI2D7/ybWrOJVuKQX8PfAn/QX8BGhlC/08ixZmjN9ouJySkItQ7xZEnJUQPW6V4\nRAXicAKi+D//5A6RrfW4YT6h9RLn7Y37i33NXxJ3LQKBgQD/D7ju56cxaUFuZo0B\np5Z62dzk/OKy98YE71X7ibyhQ+eijJ5+ffcAqy0mY9BxJgoA9VyJYVv0flxGCS+/\na3+q3mlbc0sA0azyDcBq7/D6KrPP7xUi1SMUgUkcvlG6N/PVnyaLLPindNbcJrZW\n3cI49uLMils4JhTlN2dywr4S6wKBgQDuj+TrWOYN8HIoQAdohQwQojmNnecYVeTl\LeXI1XFifI4r9WJEPTzQQ2W+jpVT+7PPg7IdVG2h206vdNoKK/Kr4krwS6S1MXqX\nJ2GwWsRuF9t3XJ7Vzk7vM3245gQmz9ohIPUfRImm7s2uyBr7DhVyV9eJyOX40mdu\nfYfQV4n1PwKBgFuCb44/TIv8wH30ixiR4PpYmdkKJeeh38i7ebTSePu+2idGnkKx\nvOHfiEZiv1EpHaO0ZCvh41T31PFHsHrT/az3OQOXfMxhbdQ2PNfhGCsZEQREOegS\nYhCkRe/rFHVkR7ZX8EM0sk2aLNA1j2vhCiLX6Q0LgqjFeO+4DgRtfDZbAoGAULKa\nNEZRI9v3Mche+SswZpwJre8BEklT8XZyKVqSTUdm7FXIVN8GKEj0LN6cgtk8/PBG\nmwdJQpwl5NI5Q4GUSDJ3OQvNfoFrP6BRuk8/PBG\nmwdJQpwl5NI5Q4GUSDJ3OQvNfoFrP6BRuk8p7TfixGCvVhHAv8eCOr6MHvjmh5hX\ncqlDixVyvDHydoRQGuq9/VzY9i9uT4DlJUPHZg8CgYEArlnVtxj4hQbbPL8Vt/O6\nMNCEgOAyG0ILa34nrVhIYqtoiwgKjgPp371OigcnRuuABjZaVViFPAtc40wJsX/U\nzullQ+F03kVK4MrBtVL2TAQfcfh8xGfcPwydh2IG2NcYijWC2adMdxCtYHIignSf\n3nxroWTKLh6xFwrx4qhb8XY=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@for-lastbench.iam.gserviceaccount.com",
  client_id: "111207528416960729536",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40for-lastbench.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

const jsonStr = JSON.stringify(serviceAccount, null, 2);

// Write to worktree
fs.writeFileSync(path.join(__dirname, 'firebase-credentials.json'), jsonStr, 'utf8');
console.log('firebase-credentials.json written successfully to worktree!');

// Write to original F:\latbenc
const fPath = 'F:\\latbenc\\firebase-credentials.json';
try {
  fs.writeFileSync(fPath, jsonStr, 'utf8');
  console.log('firebase-credentials.json written successfully to F:\\latbenc!');
} catch (err) {
  console.error('Failed to write to F:\\latbenc:', err);
}
