# NOTE (Oct 2026): cv/aden-kingi-cv.pdf is now printed from cv.html so it matches the web CV:
#   google-chrome --headless=new --no-pdf-header-footer --print-to-pdf=cv/aden-kingi-cv.pdf file://$PWD/cv.html
# This older ReportLab layout is kept for reference; running it will overwrite that PDF.

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import HexColor
import os

OUT = os.path.join(os.path.dirname(__file__), "cv", "aden-kingi-cv.pdf")
FONT_DIR = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("CVSans", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("CVSans-Bold", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFontFamily("CVSans", normal="CVSans", bold="CVSans-Bold", italic="CVSans", boldItalic="CVSans-Bold")
NAVY = HexColor("#141043")
CYAN = HexColor("#167E7C")
TEXT = HexColor("#17233A")
MUTED = HexColor("#596579")
PALE = HexColor("#E9F7F5")
LINE = HexColor("#D9E2EA")

doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm,
                        topMargin=15*mm, bottomMargin=16*mm,
                        title="Aden Kingi - Technical Support CV", author="Aden Kingi")
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Name", fontName="CVSans-Bold", fontSize=25, leading=28, textColor=NAVY, spaceAfter=2))
styles.add(ParagraphStyle(name="Role", fontName="CVSans-Bold", fontSize=11, leading=15, textColor=CYAN, spaceAfter=7))
styles.add(ParagraphStyle(name="Contact", fontName="CVSans", fontSize=8.5, leading=12, textColor=MUTED))
styles.add(ParagraphStyle(name="Section", fontName="CVSans-Bold", fontSize=11.5, leading=14, textColor=NAVY, spaceBefore=9, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="BodyCV", fontName="CVSans", fontSize=9.2, leading=13.2, textColor=TEXT, spaceAfter=4))
styles.add(ParagraphStyle(name="BulletCV", fontName="CVSans", fontSize=8.9, leading=12.4, textColor=TEXT, leftIndent=11, firstLineIndent=-7, bulletIndent=0, spaceAfter=2.5))
styles.add(ParagraphStyle(name="Subhead", fontName="CVSans-Bold", fontSize=9.4, leading=12, textColor=TEXT, spaceAfter=1))
styles.add(ParagraphStyle(name="Meta", fontName="CVSans", fontSize=8.1, leading=11, textColor=MUTED))
styles.add(ParagraphStyle(name="Small", fontName="CVSans", fontSize=8.3, leading=11.3, textColor=TEXT))

P = lambda txt, style="BodyCV": Paragraph(txt, styles[style])
story = []
story += [P("Aden Kingi", "Name"), P("Technical Support / IT Service Desk | Auckland, NZ (relocating from Tauranga)", "Role"),
          P("027 548 4458  |  adenkingi@hotmail.com  |  github.com/kingithegreat  |  kingithegreat.github.io", "Contact"), Spacer(1, 5)]

story += [P("Professional profile", "Section"),
          P("Bachelor of Applied Information Technology (Level 7) graduate from Toi Ohomai Institute of Technology, awarded June 2026 with a 92% programme average (five of six courses graded A+). Seeking a technical support or IT service desk role in Auckland. Understands hardware and software, learns systems quickly and is confident troubleshooting for people struggling with their devices, backed by tech retail at Phone Life, customer service at Aqua 360 and Subway, and more than 20 years of hands-on trades and installation work.")]

story += [P("Education and course learning", "Section"),
          P("Bachelor of Applied Information Technology (Level 7)  |  Toi Ohomai, Tauranga", "Subhead"),
          P("Awarded June 2026  |  92% programme average  |  Five of six courses graded A+", "Meta"), Spacer(1, 3)]
learning = [
    [P("Secure software development", "Subhead"), P("Applied security principles and threat-aware thinking; Cyber Security: 98 (A+).", "Small")],
    [P("Web application development", "Subhead"), P("Built understanding of client-server architecture, application behaviour and data flow; Client-Server Web Development: 96 (A+).", "Small")],
    [P("Human-centred design", "Subhead"), P("Used HCI concepts to consider usability, accessibility and how people interact with software; Human-Computer Interaction: 90 (A+).", "Small")],
    [P("Independent technical study", "Subhead"), P("Investigated and applied a focused technical topic; Special Topic: 96 (A+).", "Small")],
    [P("Capstone and delivery", "Subhead"), P("Planned and developed SADIE, now HomeBot, as a substantial software project; capstone result: 93 (A+). Practised breaking down a large brief, implementing features, testing and refining the result.", "Small")],
]
t = Table(learning, colWidths=[47*mm, 127*mm], hAlign="LEFT")
t.setStyle(TableStyle([("BACKGROUND", (0,0), (0,-1), PALE), ("BOX", (0,0), (-1,-1), .5, LINE),
                       ("INNERGRID", (0,0), (-1,-1), .35, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
                       ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
                       ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4)]))
story += [t, Spacer(1, 4), P("<b>What study developed:</b> strong computer literacy, practical troubleshooting and a methodical approach to diagnosing everyday technical issues and supporting users, a solid base for entry-level technical support and ITIL-style incident and request work. Results and letters: kingithegreat.github.io", "Small"), Spacer(1, 3), P("Earlier qualifications", "Subhead"),
          P("Diploma in Software Development (Level 6) · Diploma in Sport and Recreation (Levels 5–6, 2009–2012) · Certificate in Sports Leadership (Level 4, 2009) — Toi Ohomai Institute of Technology", "Small")]

story += [P("Skills", "Section")]
skills = [
    [P("Technical support", "Subhead"), P("Hardware troubleshooting, software troubleshooting, Microsoft 365 / computer literacy, problem solving and ownership through to resolution", "Small")],
    [P("Customer service", "Subhead"), P("Explaining technical details clearly, helping customers choose the right device or plan, calm front-of-house service and booking logistics", "Small")],
    [P("Programming", "Subhead"), P("TypeScript, JavaScript (Node.js), Python, Kotlin, Luau, HTML/CSS, SQL", "Small")],
    [P("Application development", "Subhead"), P("React, Angular, Electron, React Native, Jetpack Compose, Capacitor", "Small")],
    [P("Data, cloud and tools", "Subhead"), P("Firebase / Firestore, Git, GitHub Actions, Google Cloud Run, Vercel, Stripe, Ollama", "Small")],
    [P("Professional practice", "Subhead"), P("Automated testing, version control, CI/CD, accessibility awareness, secure design, iterative development and clear documentation", "Small")],
]
t = Table(skills, colWidths=[47*mm, 127*mm], hAlign="LEFT")
t.setStyle(TableStyle([("BACKGROUND", (0,0), (0,-1), PALE), ("BOX", (0,0), (-1,-1), .5, LINE),
                       ("INNERGRID", (0,0), (-1,-1), .35, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
                       ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
                       ("TOPPADDING", (0,0), (-1,-1), 3.5), ("BOTTOMPADDING", (0,0), (-1,-1), 3.5)]))
story += [t, PageBreak()]

story += [P("Aden Kingi", "Name"), P("Technical Support / IT Service Desk", "Role"), Spacer(1, 3),
          P("Applied learning in practice", "Section"),
          P("Selected projects show how I have practised and extended the skills developed through my degree. They support my course-based foundation; my main evidence is the learning and results above.")]
projects = [
    ("HomeBot (formerly SADIE) — AI desktop assistant", "Electron · React · TypeScript",
     "Capstone project applying software design, implementation, security and testing. Includes local AI through Ollama and permission-gated tools."),
    ("BusinessFlow — website builder", "Angular · Firebase · Stripe",
     "Built a small-business web product with a page builder, enquiry handling and subscription billing; deployed on Google Cloud Run."),
    ("Roblox and mobile projects", "Luau · Kotlin · React · GitHub Actions",
     "Created game and mobile application projects, using automated checks and deployment workflows to practise reliable delivery."),
]
for title, stack, desc in projects:
    story.append(KeepTogether([P(title, "Subhead"), P(stack, "Meta"), P(desc, "BodyCV"), Spacer(1, 3)]))

story += [P("Employment history", "Section")]
jobs = [
    ("Retail Sales Associate", "Phone Life, Tauranga Crossing  |  Apr 2026–Present", "Help customers choose phones, plans and accessories by translating technical details into clear recommendations. Handle sales transactions, stock and day-to-day store tasks."),
    ("Student Employment", "Aqua 360 and Subway, Tauranga  |  2023–2026", "Supported jet ski rental operations, safety briefings and bookings, alongside food safety and front-of-house service while completing full-time study."),
    ("Installation Technician", "HomePlus, Tauranga  |  2022–2023", "Installed security screens, wardrobes, awnings and balustrades; measured on site, consulted with clients and coordinated installation work."),
    ("Aluminium Joiner and Fabricator", "Tasman Aluminium, Tauranga  |  2017–2022", "Fabricated architectural joinery from technical drawings, with care for precision, finish and safe work practices."),
]
for title, meta, desc in jobs:
    story.append(KeepTogether([P(title, "Subhead"), P(meta, "Meta"), P(desc, "BodyCV"), Spacer(1, 2)]))

story += [P("Earlier hands-on experience", "Section"),
          P("Recreation Facility Officer · The Tech Arena, Tauranga (2011–2013)  |  Sports Centre Assistant · Mount Action Centre (2009–2011)  |  Glass Processor · Metro Glass (2007–2008)  |  Stone Mason, self-employed and contract · Queenstown and Tauranga (2002–2006)  |  Boat Builder · Tauranga (2000–2002)", "Small"),
          P("Transferable strengths", "Section"),
          P("Precision and quality habits from fabrication and installation work · Practical problem-solving · Health and safety discipline · Clear customer communication · Reliable, self-directed work · Comfortable learning new tools and finishing tasks to a high standard", "BodyCV"),
          P("References", "Section"), P("Available on request.", "BodyCV")]

def footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(LINE); canvas.setLineWidth(.5)
    canvas.line(18*mm, 12*mm, w-18*mm, 12*mm)
    canvas.setFont("CVSans", 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 8*mm, "Aden Kingi  |  027 548 4458  |  adenkingi@hotmail.com  |  Auckland, New Zealand")
    canvas.drawRightString(w-18*mm, 8*mm, f"{doc.page} / 2")
    canvas.restoreState()

doc.build(story, onFirstPage=footer, onLaterPages=footer)
