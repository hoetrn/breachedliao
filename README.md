# breachedliao
Tech Up 4 Web App 
# breachedliao.online 🇸🇬

---

## 🤷‍♂️ Problem Statement
Since 2004, Singapore has recorded 33.7 million data breaches, placing it 38th amongst 250 countries worldwide. In today's digital age, less tech-savvy individuals aged 50 and above increasingly rely on online services (e.g., e-banking, healthcare, CPF, etc) that require the use of personal information such as email addresses. Over time, this data is stored, shared, and sometimes mishandled across various platforms, making users vulnerable to data breaches, unauthorised access, and identity theft. Despite the rising number of data incidents, most people remain unaware when their sensitive information has been compromised, especially if it’s not publicly disclosed or widely reported. This leaves them vulnerable because compromised data can lead to financial losses, reputational damage, and long-term emotional distress, further exacerbating the digital divide.

## 💡 Description of Web App
A user-friendly web application that enables individuals to easily check if their email address has been exposed in data breaches, spam databases, or leaked repositories. The app generates a comprehensive hygiene report that includes a risk score and personalised recommendations to help users better secure their personal information and data. To ensure user trust, the web app features a clear privacy assurance banner with no user log in required. This approach not only addresses data security concerns but also reinforces user confidence by prioritising transparency and privacy.

TLDR: A user-friendly web app that lets anyone check if their email address has been exposed in data breaches.

---

## 🌐 Live App
Visit: [https://breachedliao.online](https://breachedliao.online)

---

## 🎯 Purpose
- Help less tech-savvy users (especially 50+) stay informed about personal data leaks
- Provide a **risk score** and **recommendations** to improve overall cyber hygiene
- Let returning users **track improvements** over time — without needing to log in

---

## 🔐 Key Features
- **No login required** — user comparison tracked anonymously via secure cookie
- **CAPTCHA** to enhance security and avoid bots
- **Email breach check** via HaveIBeenPwned API
- **Risk score** (0–100) based on breach count and severity
- **Hygiene report** with practical security recommendations
- **Privacy banner** to reassure users: 'Your data will not be saved. A secure cookie tracks hygiene scores anonymously.'

---

## 🧰 Tech Stack
| Layer        | Stack                            |
|--------------|----------------------------------|
| Frontend     | HTML, CSS, JavaScript, EJS       |
| Backend      | Node.js, Express, cookie-parser  |
| API Source   | [HaveIBeenPwned](https://haveibeenpwned.com/API/v3) |
| Database     | PostgreSQL                       |
| Hosting      | Render + GitHub                  |

---
