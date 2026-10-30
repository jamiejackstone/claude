import datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL
from openpyxl.chart import BarChart, Reference
from openpyxl.comments import Comment

OUT = '/tmp/claude-0/-home-user-claude/2e9593c9-8253-5edb-b8a0-36677906ecc4/scratchpad/finance/Heroes Arena 3-year model v0.2 DRAFT.xlsx'
F = 'Arial'
NAVY, GOLD = '14264E', 'FBA91A'
f_base = Font(name=F, size=10)
f_in = Font(name=F, size=10, color='0000FF')
f_link = Font(name=F, size=10, color='008000')
f_b = Font(name=F, size=10, bold=True)
f_h = Font(name=F, size=14, bold=True, color=NAVY)
f_sec = Font(name=F, size=10, bold=True, color='FFFFFF')
f_note = Font(name=F, size=9, italic=True, color='555555')
fill_sec = PatternFill('solid', fgColor=NAVY)
fill_key = PatternFill('solid', fgColor='FFFF00')
fill_tot = PatternFill('solid', fgColor='FDE9C4')
GBP = '£#,##0;(£#,##0);-'
GBP2 = '£#,##0.00;(£#,##0.00);-'
NUM = '#,##0;(#,##0);-'
NUM1 = '#,##0.0;(#,##0.0);-'
PCT = '0.0%;(0.0%);-'
thin = Side(style='thin', color='999999')

wb = Workbook()

# ---------------- Assumptions ----------------
A = wb.active
A.title = 'Assumptions'
A['A1'] = 'Heroes Arena: assumptions'; A['A1'].font = f_h
A['A2'] = 'Blue = input you can change. Pick the case in C3; every other sheet follows. Labels say where each figure comes from.'; A['A2'].font = f_note
A['A3'] = 'Case shown (1 = Downside, 2 = Cautious, 3 = Target)'; A['A3'].font = f_b
A['C3'] = 3; A['C3'].font = Font(name=F, size=12, bold=True, color='0000FF'); A['C3'].fill = fill_key
A['D3'] = '=CHOOSE($C$3,"Downside","Cautious","Target")'; A['D3'].font = f_b
for c, t in zip('ABCDEFG', ['Assumption', 'Unit', 'Downside', 'Cautious', 'Target', 'Live (case shown)', 'Source / label']):
    cell = A[f'{c}5']; cell.value = t; cell.font = f_sec; cell.fill = fill_sec
R = {}
row = 6
def sec(title):
    global row
    A[f'A{row}'] = title; A[f'A{row}'].font = f_b; A[f'A{row}'].fill = fill_tot
    for c in 'BCDEFG': A[f'{c}{row}'].fill = fill_tot
    row += 1
def p(key, label, unit, vals, src, fmt=NUM):
    global row
    if not isinstance(vals, (list, tuple)): vals = [vals] * 3
    A[f'A{row}'] = label; A[f'B{row}'] = unit; A[f'G{row}'] = src
    A[f'A{row}'].font = f_base; A[f'B{row}'].font = f_base; A[f'G{row}'].font = f_note
    for c, v in zip('CDE', vals):
        A[f'{c}{row}'] = v; A[f'{c}{row}'].font = f_in; A[f'{c}{row}'].number_format = fmt
    A[f'F{row}'] = f'=CHOOSE($C$3,C{row},D{row},E{row})'; A[f'F{row}'].font = f_b; A[f'F{row}'].number_format = fmt
    R[key] = row; row += 1
def d(key, label, unit, formula, src, fmt=NUM):
    # derived row: same formula in each case column
    global row
    A[f'A{row}'] = label; A[f'B{row}'] = unit; A[f'G{row}'] = src
    A[f'A{row}'].font = f_base; A[f'B{row}'].font = f_base; A[f'G{row}'].font = f_note
    for c in 'CDEF':
        import re as _re
        A[f'{c}{row}'] = '=' + _re.sub(r'#\{(\w+)\}', lambda m: f'{c}{R[m.group(1)]}', formula); A[f'{c}{row}'].number_format = fmt
        A[f'{c}{row}'].font = f_b if c == 'F' else f_base
    R[key] = row; row += 1

sec('Opening and members')
p('open', 'Arena opens', 'date', dt.date(2027, 9, 1), 'Desk assumption: September 2027 (planning note v1.0: summer 2027 is the realistic fast date)', 'd mmm yyyy')
p('m0', 'Members on opening (moving in)', 'members', [78, 100, 100], 'Jamie assumption: 100+ (Aylesbury 31 + Wendover 67 = 98, actual TeamUp 26 Oct 2026). Downside uses the KB retention case (~78 move)')
p('m1', 'Members, end of Year 1', 'members', [110, 150, 220], 'Jamie assumption (target); cautious and downside are desk estimates')
p('m2', 'Members, end of Year 2', 'members', [140, 200, 320], 'Jamie assumption (target); cautious and downside are desk estimates')
p('m3', 'Members, end of Year 3', 'members', [170, 250, 400], 'Target 400: Jamie, 29 Oct 2026. Cautious 250: KB growth case (HHOS 2.0 / Project Overview v0.2)')
p('fee', 'Membership fee, realised per member', '£/month', 35, 'Actual: £34.73–£35 realised fee (Project Overview v0.2, Finance)', GBP2)
p('uptake', 'Members adding a 2nd weekly session', '% of members', [0.15, 0.20, 0.25], 'Desk estimate (HHOS 2.0 suggests about a third on multi-session plans)', PCT)
p('addon', '2nd weekly session price', '£/month', 25, 'Jamie, 29 Oct 2026', GBP2)
p('uptake3', 'Members on a 3-a-week plan', '% of members', [0.03, 0.05, 0.08], 'Desk estimate', PCT)
p('addon3', '3-a-week plan price, on top of the membership', '£/month', 40, 'Jamie, 29 Oct 2026', GBP2)
p('join', 'Joining fee per new member', '£', 45, 'Jamie, 29 Oct 2026. Families moving in from today\'s classes don\'t pay it', GBP)
p('churn', 'Members leaving each month (replaced by new joiners)', '% a month', 0.025, 'Desk estimate; to replace with TeamUp actuals', PCT)
p('size', 'Average children per class', 'children', 18, 'Actual: 140 bookings across 8 classes (TeamUp, 26 Oct 2026); class cap placeholder 20')
p('weeks', 'Coaching weeks a year (classes)', 'weeks', 39, 'Actual: halls booked 39 weeks a year (Court Hub vs hall hire v0.1)')
p('frs', 'Flat Rate VAT on sales', '% of gross', 0.085, 'Desk estimate: FRS rate for sport/leisure; HHR1 is on the FRS (Jamie, 26 Oct). Confirm with the accountant', PCT)
p('payfee', 'Card and payment fees', '% of sales', 0.02, 'Desk estimate (Stripe)', PCT)

sec('Coaching (one head coach + one assistant per session)')
p('head', 'Head coach pay', '£/hour', 25, 'Jamie, 29 Oct 2026', GBP2)
p('asst', 'Assistant coach pay', '£/hour', 15, 'Jamie, 29 Oct 2026', GBP2)
p('hrs', 'Paid hours per 1-hour session', 'hours', 1.25, 'Desk estimate: includes set-up and pack-down', NUM1 if False else '0.00')
p('oncost', 'Employer on-costs (holiday pay, NI)', '% of pay', 0.10, 'Desk estimate; confirm with Finance', PCT)
d('sess', 'Cost of one coached session', '£/session', '(#{head}+#{asst})*#{hrs}*(1+#{oncost})', 'Formula', GBP2)

p('hours', 'Court hours we can use a week (outside the school day)', 'hours', 45, 'Desk estimate: weekdays 3:30–8:30pm (25) + weekends 9am–7pm (20). Today: 3 hours a week in halls')

sec('Birthday parties')
p('pprice', 'Party price', '£/party', 225, 'Jamie, 29 Oct 2026 (about 90 minutes, up to 20 children)', GBP)
p('p1', 'Parties a week, Year 1', 'parties', [0.5, 1, 1.5], 'Desk estimate')
p('p2', 'Parties a week, Year 2', 'parties', [1, 1.5, 2.5], 'Desk estimate')
p('p3', 'Parties a week, Year 3', 'parties', [1, 2, 3.5], 'Desk estimate')
p('phrs', 'Staff hours per party (both coaches)', 'hours', 2, 'Desk estimate', '0.00')
p('pext', 'Party extras (medals, kit, cleaning)', '£/party', 25, 'Desk estimate', GBP)
p('plen', 'Court time per party', 'hours', 1.5, 'Desk estimate', '0.00')

sec('3x3 tournaments (one-day events, like Gameday)')
p('t1', 'Tournaments a year, Year 1', 'events', [2, 3, 4], 'Desk estimate')
p('t2', 'Tournaments a year, Year 2', 'events', [3, 5, 6], 'Desk estimate')
p('t3', 'Tournaments a year, Year 3', 'events', [4, 6, 8], 'Desk estimate')
p('tplay', 'Players per tournament', 'players', [24, 32, 40], 'Desk estimate (Gameday: 3 on court + 1 sub per team)')
p('tfee', 'Entry fee per player', '£', 30, 'Actual: 3x3 Gameday £30 per player (website, Oct 2026)', GBP)
p('tstaff', 'Coach hours per tournament (all staff)', 'hours', 12, 'Desk estimate: 2 head + 2 assistant coaches for 3 hours', '0.00')
p('tcost', 'Medals and extras per player', '£', 4, 'Desk estimate', GBP)

sec('Holiday camps')
p('cprice', 'Camp price', '£/child/day', 35, 'Jamie, 29 Oct 2026 (9am to 3pm)', GBP)
p('cs1', 'Share of holiday weeks we run, Year 1', '% of 13 weeks', [0.4, 0.5, 0.6], 'Desk estimate', PCT)
p('cs2', 'Share of holiday weeks we run, Year 2', '% of 13 weeks', [0.6, 0.75, 0.9], 'Desk estimate', PCT)
p('cs3', 'Share of holiday weeks we run, Year 3', '% of 13 weeks', [0.75, 1, 1], 'Desk estimate', PCT)
p('c1', 'Paying campers a day, Year 1', 'children', [12, 16, 20], 'Desk estimate')
p('c2', 'Paying campers a day, Year 2', 'children', [16, 20, 28], 'Desk estimate')
p('c3', 'Paying campers a day, Year 3', 'children', [18, 24, 36], 'Desk estimate')
p('cratio', 'Children per coach at camp', 'children', 12, 'Desk estimate')
p('chrs', 'Staff hours per camp day', 'hours', 7, 'Desk estimate (9am to 3pm plus set-up)', '0.00')
d('crate', 'Average coach rate at camp', '£/hour', '(#{head}+#{asst})/2*(1+#{oncost})', 'Formula', GBP2)

sec('Funded holiday places (Holiday Activities and Food programme)')
p('h1', 'Funded places a day, Year 1', 'children', [0, 10, 15], 'Desk estimate; needs approval as a Bucks HAF provider')
p('h2', 'Funded places a day, Year 2', 'children', [10, 15, 20], 'Desk estimate')
p('h3', 'Funded places a day, Year 3', 'children', [10, 20, 25], 'Desk estimate')
p('hrate', 'HAF payment per place per day', '£', 25, 'Desk estimate: to verify with Buckinghamshire Council HAF', GBP)
p('hdays', 'HAF days per HAF week', 'days', 4, 'Desk estimate (HAF runs 4 days a week)')
p('hcost', 'Food and extra cost per HAF place per day', '£', 8, 'Desk estimate', GBP)

sec('Breakfast All Stars (before school)')
p('bprice', 'Price per morning', '£/child', 7, 'Desk estimate', GBP2)
p('bmorn', 'Mornings a week', 'mornings', 5, 'Example week in the schools deck')
p('b1', 'Children per morning, Year 1', 'children', [6, 8, 10], 'Desk estimate')
p('b2', 'Children per morning, Year 2', 'children', [8, 12, 15], 'Desk estimate')
p('b3', 'Children per morning, Year 3', 'children', [10, 14, 20], 'Desk estimate')
p('bhrs', 'Head coach hours per morning', 'hours', 1.25, 'Desk estimate (one coach)', '0.00')

sec('3x3 leagues')
p('lfee', 'League fee per player per term', '£', 60, 'Desk estimate', GBP)
p('lterms', 'League terms a year', 'terms', 3, 'Desk estimate')
p('l1', 'League players, Year 1', 'players', [0, 24, 32], 'Desk estimate')
p('l2', 'League players, Year 2', 'players', [24, 40, 60], 'Desk estimate')
p('l3', 'League players, Year 3', 'players', [32, 48, 80], 'Desk estimate')
p('lsess', 'League sessions a week', 'sessions', 2, 'Desk estimate')

sec('Other income')
p('s1', 'School PE support and CPD, Year 1', '£/year', [1500, 3000, 4000], 'Desk estimate; paid by the school from its PE and Sport Premium (revenue only)', GBP)
p('s2', 'School PE support and CPD, Year 2', '£/year', [2500, 4000, 6000], 'Desk estimate', GBP)
p('s3', 'School PE support and CPD, Year 3', '£/year', [3000, 5000, 8000], 'Desk estimate', GBP)
p('x1', 'Hire of unused hours, Year 1', '£/year', [0, 0, 1000], 'Desk estimate; school agreement and VAT to check', GBP)
p('x2', 'Hire of unused hours, Year 2', '£/year', [0, 1500, 3000], 'Desk estimate', GBP)
p('x3', 'Hire of unused hours, Year 3', '£/year', [1000, 3000, 5000], 'Desk estimate', GBP)

sec('Community sessions (free, SEND, wheelchair, girls-only, over-40s)')
p('cmty', 'Community sessions a week', 'sessions', [2, 3, 4], 'Desk estimate; timetable owned by the Coaching Director')
p('gc1', 'Share of their coaching cost paid by grants, Year 1', '% of cost', 0, 'Jamie, 29 Oct 2026: Arena #1 runs through the Ltd; most community grants need a not-for-profit, so none in Year 1', PCT)
p('gc2', 'Share paid by grants, Year 2', '% of cost', [0.25, 0.5, 0.75], 'Desk estimate: once a CIC is set up after Arena #1 is proven', PCT)
p('gc3', 'Share paid by grants, Year 3', '% of cost', [0.5, 0.75, 1.0], 'Desk estimate', PCT)

sec('Arena running costs')
p('fin', 'Supplier finance (Zappshelter package)', '£/month', 2000, 'Indicative: Zappshelter, Peter Laird, 29 Oct 2026: about £2,000 + VAT a month over 5 years (about £3,000 over 3) for the £87,343 + VAT package. Containers not included. VAT treatment to confirm', GBP)
p('finm', 'Finance term', 'months', 60, 'Indicative, as above')
p('run', 'Running: insurance, power, maintenance, fabric fund', '£/month', [1000, 1000, 750], 'Desk estimate: HHOS 2.0 £6k–£12k a year', GBP)
p('heat', 'Heating, per winter (Nov to Mar)', '£/winter', [9500, 7550, 7550], 'Desk estimate: £5.6k–£9.5k per winter (options paper v1.0); to re-estimate', GBP)
p('rent', 'Rent to the school', '£/month', 0, 'Jamie, 29 Oct 2026: zero rent under the school agreement', GBP)
p('mkt', 'Marketing', '£/month', [300, 300, 400], 'Desk estimate', GBP)
p('adm', 'Admin and systems', '£/month', 250, 'Desk estimate', GBP)
p('equip', 'Kit replacement', '£/year', [1500, 1000, 1000], 'Desk estimate', GBP)

sec('Today, in rented halls (for comparison)')
p('bm', 'Members today (Aylesbury + Wendover)', 'members', 98, 'Actual: TeamUp paid members, 26 Oct 2026')
p('bhall', 'Hall rent today', '£/month', 607.85, 'Actual: invoices and Finance model (Project Overview v0.2)', GBP2)
p('bcls', 'Classes a week today', 'classes', 5, 'Actual: TeamUp, 26 Oct 2026')

# calendar pattern table
row += 1
A[f'A{row}'] = 'Holiday and winter calendar'; A[f'A{row}'].font = f_b; row += 1
for c, t in zip('ABCDE', ['Month', 'Month no.', 'Camp weeks', 'HAF weeks', 'Heating month (1 = yes)']):
    A[f'{c}{row}'] = t; A[f'{c}{row}'].font = f_sec; A[f'{c}{row}'].fill = fill_sec
row += 1
cal0 = row
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
camp = [0, 1, 0, 2, 1, 0, 2, 4, 0, 1, 0, 2]   # 13 weeks
haf = [0, 0, 0, 1, 0, 0, 1, 3, 0, 0, 0, 1]    # Easter, summer (4), Christmas
heat = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1]
for i in range(12):
    A[f'A{row}'] = months[i]; A[f'B{row}'] = i + 1
    for c, v in zip('CDE', [camp[i], haf[i], heat[i]]):
        A[f'{c}{row}'] = v; A[f'{c}{row}'].font = f_in
    A[f'A{row}'].font = f_base; A[f'B{row}'].font = f_base
    row += 1
cal1 = row - 1
A[f'A{row}'] = 'Totals'; A[f'A{row}'].font = f_b
for c in 'CDE':
    A[f'{c}{row}'] = f'=SUM({c}{cal0}:{c}{cal1})'; A[f'{c}{row}'].font = f_b
A[f'F{row}'] = 'Camp weeks = school holidays (13); HAF = Easter, summer and Christmas (desk estimate)'; A[f'F{row}'].font = f_note

for c, w in zip('ABCDEFG', [46, 14, 11, 11, 11, 15, 90]):
    A.column_dimensions[c].width = w
A.freeze_panes = 'A6'

L = lambda k: f'Assumptions!$F${R[k]}'
def yr(k, col):  # pick the Year 1/2/3 value
    return f'CHOOSE({col}$5,{L(k+"1")},{L(k+"2")},{L(k+"3")})'

# ---------------- Monthly ----------------
M = wb.create_sheet('Monthly')
M['A1'] = 'Heroes Arena: month by month, 36 months'; M['A1'].font = f_h
M['A2'] = '=CONCATENATE("Case shown: ",Assumptions!$D$3,". All £ after Flat Rate VAT. Change inputs on the Assumptions sheet only.")'; M['A2'].font = f_note
cols = [CL(i) for i in range(3, 39)]  # C..AL
rows = {}
def mrow(r, label, tmpl, fmt=GBP, bold=False, fill=None, key=None):
    M[f'B{r}'] = label; M[f'B{r}'].font = f_b if bold else f_base
    for i, c in enumerate(cols):
        prev = cols[i - 1] if i else None
        v = tmpl(c, prev)
        M[f'{c}{r}'] = v
        M[f'{c}{r}'].number_format = fmt
        M[f'{c}{r}'].font = f_b if bold else f_base
        if fill: M[f'{c}{r}'].fill = fill
    if fill: M[f'B{r}'].fill = fill
    if key: rows[key] = r
def header(r, label):
    M[f'B{r}'] = label; M[f'B{r}'].font = f_sec; M[f'B{r}'].fill = fill_sec
    for c in cols: M[f'{c}{r}'].fill = fill_sec

M['B3'] = 'Month'; M['B3'].font = f_b
for i, c in enumerate(cols):
    M[f'{c}3'] = i + 1; M[f'{c}3'].font = f_base
M['B4'] = 'Month starting'; M['B4'].font = f_b
for c in cols:
    M[f'{c}4'] = f'=EDATE({L("open")},{c}3-1)'; M[f'{c}4'].number_format = 'mmm yy'; M[f'{c}4'].font = f_b
mrow(5, 'Arena year', lambda c, p: f'=ROUNDUP({c}3/12,0)', '0')
mrow(6, 'Calendar month', lambda c, p: f'=MONTH({c}4)', '0')
CAL = lambda col, c: f'INDEX(Assumptions!${col}${cal0}:${col}${cal1},{c}$6)'
net = f'(1-{L("frs")})'
TW = f'{L("weeks")}/12'

header(8, 'MEMBERS')
mrow(9, 'Members', lambda c, p: f'=IF({c}3<=12,{L("m0")}+({L("m1")}-{L("m0")})*{c}3/12,IF({c}3<=24,{L("m1")}+({L("m2")}-{L("m1")})*({c}3-12)/12,{L("m2")}+({L("m3")}-{L("m2")})*({c}3-24)/12))', NUM, key='mem')
mrow(10, 'Of which on a 2-a-week plan', lambda c, p: f'={c}9*{L("uptake")}', NUM, key='mem2')
mrow(11, 'Of which on a 3-a-week plan', lambda c, p: f'={c}9*{L("uptake3")}', NUM, key='mem3')
mrow(12, 'New joiners (growth + replacing leavers)', lambda c, p: f'=MAX(0,{c}9-{L("m0")})+{L("churn")}*{L("m0")}' if p is None else f'=MAX(0,{c}9-{p}9)+{L("churn")}*{p}9', NUM1, key='newm')
mrow(13, 'Class sessions a week', lambda c, p: f'=ROUNDUP(({c}9+{c}10+2*{c}11)/{L("size")},0)', NUM, key='cls')

header(15, 'INCOME (after Flat Rate VAT)')
mrow(16, 'Memberships', lambda c, p: f'={c}9*{L("fee")}*{net}', key='i_mem')
mrow(17, '2-a-week plans', lambda c, p: f'={c}10*{L("addon")}*{net}', key='i_add')
mrow(18, '3-a-week plans', lambda c, p: f'={c}11*{L("addon3")}*{net}', key='i_add3')
mrow(19, 'Joining fees', lambda c, p: f'={c}12*{L("join")}*{net}', key='i_join')
mrow(20, 'Birthday parties', lambda c, p: f'={yr("p", c)}*52/12*{L("pprice")}*{net}', key='i_party')
mrow(21, '3x3 tournaments', lambda c, p: f'={yr("t", c)}/12*{L("tplay")}*{L("tfee")}*{net}', key='i_tour')
mrow(22, 'Holiday camps', lambda c, p: f'={CAL("C", c)}*5*{yr("cs", c)}*{yr("c", c)}*{L("cprice")}*{net}', key='i_camp')
mrow(23, 'Funded holiday places (HAF)', lambda c, p: f'={CAL("D", c)}*{L("hdays")}*{yr("h", c)}*{L("hrate")}', key='i_haf')
mrow(24, 'Breakfast All Stars', lambda c, p: f'={L("bmorn")}*{TW}*{yr("b", c)}*{L("bprice")}*{net}', key='i_bfast')
mrow(25, '3x3 leagues', lambda c, p: f'={yr("l", c)}*{L("lfee")}*{L("lterms")}/12*{net}', key='i_lg')
mrow(26, 'School PE support and CPD', lambda c, p: f'={yr("s", c)}/12*{net}', key='i_sch')
mrow(27, 'Hire of unused hours', lambda c, p: f'={yr("x", c)}/12*{net}', key='i_hire')
mrow(28, 'Grants for community sessions', lambda c, p: f'={L("cmty")}*{TW}*{L("sess")}*{yr("gc", c)}', key='i_grant')
mrow(29, 'Total income', lambda c, p: f'=SUM({c}16:{c}28)', bold=True, fill=fill_tot, key='inc')

header(31, 'DIRECT COSTS')
mrow(32, 'Class coaching', lambda c, p: f'={c}13*{TW}*{L("sess")}', key='c_cls')
mrow(33, 'Party staff and extras', lambda c, p: f'={yr("p", c)}*52/12*({L("phrs")}*({L("head")}+{L("asst")})*(1+{L("oncost")})+{L("pext")})', key='c_party')
mrow(34, 'Tournament staff and medals', lambda c, p: f'={yr("t", c)}/12*({L("tstaff")}*{L("crate")}+{L("tplay")}*{L("tcost")})', key='c_tour')
mrow(35, 'Camp staff', lambda c, p: f'={CAL("C", c)}*5*{yr("cs", c)}*ROUNDUP({yr("c", c)}/{L("cratio")},0)*{L("chrs")}*{L("crate")}', key='c_camp')
mrow(36, 'Funded places: food and extra staff', lambda c, p: f'={CAL("D", c)}*{L("hdays")}*{yr("h", c)}*{L("hcost")}', key='c_haf')
mrow(37, 'Breakfast coaching', lambda c, p: f'={L("bmorn")}*{TW}*{L("head")}*{L("bhrs")}*(1+{L("oncost")})*({yr("b", c)}>0)', key='c_bfast')
mrow(38, 'League coaching', lambda c, p: f'={L("lsess")}*{TW}*{L("sess")}*({yr("l", c)}>0)', key='c_lg')
mrow(39, 'Community session coaching', lambda c, p: f'={L("cmty")}*{TW}*{L("sess")}', key='c_cmty')
mrow(40, 'Card and payment fees', lambda c, p: f'=SUM({c}16:{c}22,{c}24:{c}25)/{net}*{L("payfee")}', key='c_fees')
mrow(41, 'Total direct costs', lambda c, p: f'=SUM({c}32:{c}40)', bold=True, fill=fill_tot, key='dc')
mrow(43, 'Contribution after direct costs', lambda c, p: f'={c}29-{c}41', bold=True, key='contrib')

header(45, 'ARENA COSTS')
mrow(46, 'Supplier finance (Zappshelter package)', lambda c, p: f'={L("fin")}*({c}3<={L("finm")})', key='a_fin')
mrow(47, 'Running: insurance, power, maintenance', lambda c, p: f'={L("run")}', key='a_run')
mrow(48, 'Heating (winter months)', lambda c, p: f'={L("heat")}/SUM(Assumptions!$E${cal0}:$E${cal1})*{CAL("E", c)}', key='a_heat')
mrow(49, 'Rent to the school', lambda c, p: f'={L("rent")}', key='a_rent')
mrow(50, 'Marketing', lambda c, p: f'={L("mkt")}', key='a_mkt')
mrow(51, 'Admin and systems', lambda c, p: f'={L("adm")}', key='a_adm')
mrow(52, 'Kit replacement', lambda c, p: f'={L("equip")}/12', key='a_eq')
mrow(53, 'Total Arena costs', lambda c, p: f'=SUM({c}46:{c}52)', bold=True, fill=fill_tot, key='ac')

mrow(55, 'SITE PROFIT (before central overheads)', lambda c, p: f'={c}43-{c}53', bold=True, fill=PatternFill('solid', fgColor='D9EAD3'), key='profit')
mrow(56, 'Cumulative site profit', lambda c, p: f'={c}55' if p is None else f'={p}56+{c}55', key='cum')
header(58, 'CAPACITY')
mrow(59, 'Court hours used a week (classes, community, leagues, parties)', lambda c, p: f'={c}13+{L("cmty")}+{L("lsess")}*({yr("l", c)}>0)+{yr("p", c)}*{L("plen")}', NUM1, key='hused')
mrow(60, 'Share of usable court hours', lambda c, p: f'={c}59/{L("hours")}', PCT, key='util')
M.column_dimensions['A'].width = 2
M.column_dimensions['B'].width = 40
for c in cols: M.column_dimensions[c].width = 10
M.freeze_panes = 'C5'

# ---------------- Summary ----------------
S = wb.create_sheet('Summary', 0)
S['A1'] = 'Heroes Arena: 3-year summary'; S['A1'].font = f_h
S['A2'] = '=CONCATENATE("Case shown: ",Assumptions!$D$3,". Internal draft for discussion. Every input is labelled on the Assumptions sheet.")'; S['A2'].font = f_note
hdr = ['', 'Today, rented halls (per year)', 'Arena Year 1', 'Arena Year 2', 'Arena Year 3']
for i, t in enumerate(hdr):
    cell = S.cell(row=4, column=i + 1, value=t); cell.font = f_sec; cell.fill = fill_sec; cell.alignment = Alignment(wrap_text=True, horizontal='center')
S.row_dimensions[4].height = 30
YR = {'C': 1, 'D': 2, 'E': 3}
def sumyr(key, col):
    r = rows[key]
    return f'=SUMIF(Monthly!$C$5:$AL$5,{YR[col]},Monthly!$C${r}:$AL${r})'
r = 5
def srow(label, today, key=None, fmt=GBP, bold=False, fill=None, custom=None):
    global r
    S[f'A{r}'] = label; S[f'A{r}'].font = f_b if bold else f_base
    S[f'B{r}'] = today
    for col in 'CDE':
        S[f'{col}{r}'] = custom(col) if custom else sumyr(key, col)
    for col in 'BCDE':
        S[f'{col}{r}'].number_format = fmt; S[f'{col}{r}'].font = f_b if bold else f_base
        if fill: S[f'{col}{r}'].fill = fill
    if fill: S[f'A{r}'].fill = fill
    out = r; r += 1; return out
endm = {'C': 'N', 'D': 'Z', 'E': 'AL'}
rm = srow('Members at year end', f'={L("bm")}', fmt=NUM, custom=lambda col: f'=Monthly!{endm[col]}9')
srow('Class sessions a week at year end', f'={L("bcls")}', fmt=NUM, custom=lambda col: f'=Monthly!{endm[col]}13')
srow('Court hours used, share of usable hours', '', fmt=PCT, custom=lambda col: f'=Monthly!{endm[col]}60')
r += 1
S[f'A{r}'] = 'Income'; S[f'A{r}'].font = f_b; r += 1
r_inc0 = r
srow('Memberships, multi-session plans and joining fees', f'={L("bm")}*{L("fee")}*12*(1-{L("frs")})', custom=lambda col: f'{sumyr("i_mem", col)}+{sumyr("i_add", col)[1:]}+{sumyr("i_add3", col)[1:]}+{sumyr("i_join", col)[1:]}')
srow('Birthday parties and 3x3 tournaments', 0, custom=lambda col: f'{sumyr("i_party", col)}+{sumyr("i_tour", col)[1:]}')
srow('Holiday camps and funded places', 0, custom=lambda col: f'{sumyr("i_camp", col)}+{sumyr("i_haf", col)[1:]}')
srow('Breakfast All Stars and leagues', 0, custom=lambda col: f'{sumyr("i_bfast", col)}+{sumyr("i_lg", col)[1:]}')
srow('School PE support, hire and grants', 0, custom=lambda col: f'{sumyr("i_sch", col)}+{sumyr("i_hire", col)[1:]}+{sumyr("i_grant", col)[1:]}')
r_inc1 = r - 1
r_inc = srow('Total income', f'=SUM(B{r_inc0}:B{r_inc1})', bold=True, fill=fill_tot, custom=lambda col: f'=SUM({col}{r_inc0}:{col}{r_inc1})')
r += 1
S[f'A{r}'] = 'Costs'; S[f'A{r}'].font = f_b; r += 1
r_c0 = r
srow('Coaching and session costs', f'={L("bcls")}*{L("weeks")}*{L("sess")}+B{r_inc0}/(1-{L("frs")})*{L("payfee")}', 'dc')
srow('Hall rent', f'={L("bhall")}*12', custom=lambda col: '=0')
srow('Arena finance', 0, 'a_fin')
srow('Arena running and heating', 0, custom=lambda col: f'{sumyr("a_run", col)}+{sumyr("a_heat", col)[1:]}+{sumyr("a_rent", col)[1:]}')
srow('Marketing, admin and kit', 0, custom=lambda col: f'{sumyr("a_mkt", col)}+{sumyr("a_adm", col)[1:]}+{sumyr("a_eq", col)[1:]}')
r_c1 = r - 1
r_cost = srow('Total costs', f'=SUM(B{r_c0}:B{r_c1})', bold=True, fill=fill_tot, custom=lambda col: f'=SUM({col}{r_c0}:{col}{r_c1})')
r += 1
r_prof = srow('SITE PROFIT (before central overheads)', f'=B{r_inc}-B{r_cost}', bold=True, fill=PatternFill('solid', fgColor='D9EAD3'), custom=lambda col: f'={col}{r_inc}-{col}{r_cost}')
srow('Profit margin', f'=IF(B{r_inc}=0,0,B{r_prof}/B{r_inc})', fmt=PCT, custom=lambda col: f'=IF({col}{r_inc}=0,0,{col}{r_prof}/{col}{r_inc})')
r_up = srow('Extra profit vs rented halls', '', bold=True, custom=lambda col: f'={col}{r_prof}-$B${r_prof}')
srow('Income per member a year', f'=IF(B{rm}=0,0,B{r_inc}/B{rm})', custom=lambda col: f'=IF({col}{rm}=0,0,{col}{r_inc}/{col}{rm})')
r += 1
S[f'A{r}'] = 'Notes'; S[f'A{r}'].font = f_b; r += 1
notes = [
    '"Today" is Aylesbury and Wendover in rented halls for a year at today\'s members, with no growth: halls cap the timetable.',
    'Site profit is before central overheads (management, head office, owner pay). The Arena column also carries its own marketing, admin and kit, so the comparison is cautious.',
    'Capacity: the Arena has about 45 usable court hours a week against 3 hours in halls today. Above about 90% the timetable is full.',
    'On rent saved alone the Arena does not pay its way (Project Overview v0.2). The extra profit comes from growth: more members, 2nd sessions, parties, camps, breakfast and leagues.',
    'Not included: business rates, structure insurance above the running allowance, professional fees and any build costs not covered by finance (see Build and funding).',
    'Figures are a desk model for discussion, not a forecast or advice. VAT, CIC and finance terms to confirm with the accountant.',
]
for n in notes:
    S[f'A{r}'] = n; S[f'A{r}'].font = f_note; r += 1
S.column_dimensions['A'].width = 44
for c in 'BCDE': S.column_dimensions[c].width = 18
# chart: profit, today vs Arena years
ch = BarChart(); ch.type = 'col'; ch.title = 'Yearly site profit: rented halls vs Heroes Arena'; ch.style = 10
ch.add_data(Reference(S, min_col=2, max_col=5, min_row=r_prof, max_row=r_prof), from_rows=True, titles_from_data=False)
ch.set_categories(Reference(S, min_col=2, max_col=5, min_row=4, max_row=4))
ch.legend = None; ch.y_axis.title = '£ a year'; ch.height = 8; ch.width = 18
ch.y_axis.numFmt = '£#,##0'
S.add_chart(ch, f'G4')

# ---------------- Build and funding ----------------
B = wb.create_sheet('Build and funding')
B['A1'] = 'Heroes Arena: build cost and how it is paid for'; B['A1'].font = f_h
B['A2'] = 'Ex VAT unless stated. A floor, not a budget: formal quotes still needed (Project Overview v0.2, cost sheet v6.6).'; B['A2'].font = f_note
for c, t in zip('ABCDE', ['Item', 'Low £', 'High £', 'Middle £', 'Source / label']):
    B[f'{c}4'] = t; B[f'{c}4'].font = f_sec; B[f'{c}4'].fill = fill_sec
items = [
    ('Zappshelter package: 17 × 12.2 m canopy, branded covers, end walls, roller door, fire door, install', 87343, 87343, 'Quote: Zappshelter, Peter Laird, 29 Oct 2026 (includes container mounting kit and plant hire)'),
    ('Containers: 40 ft reception + 2 × 20 ft stores', 8600, 12000, 'Indicative low: Zappshelter 29 Oct, 2 × 40 ft at about £4,300 each delivered (rental option £112/month each). High: desk estimate for converted units'),
    ('Reception fit-out and accessible WC', 12000, 20000, 'Placeholder: unpriced (new spec, 29 Oct 2026)'),
    ('Court tiles, custom multi-sport, 15.0 × 10.2 m', 6250, 6250, 'Quote: Net World Sports Q00129975, 28 Oct 2026 (logo, edging, basketball, pickleball and badminton lines). Shipping to confirm'),
    ('Run-off tiles', 2552, 3358, 'Desk estimate, cost sheet v6.6'),
    ('Three movable hoops', 4000, 4000, 'Jamie assumption, 28 Oct 2026'),
    ('LED lighting and electrics', 3650, 6650, 'Electrician £650 (desk) + lighting placeholder £3k–£6k'),
    ('Multi-sport kit and sports wheelchairs', 3000, 8000, 'Placeholder: nets, paddles, dodgeballs, 2–4 sports wheelchairs'),
    ('Planning, structural and safety fees', 5813, 9423, 'Planning £2,813–£3,423 (list + desk calc) + professionals placeholder £3k–£6k'),
]
r = 5
for name, lo, hi, src in items:
    B[f'A{r}'] = name; B[f'B{r}'] = lo; B[f'C{r}'] = hi; B[f'D{r}'] = f'=AVERAGE(B{r}:C{r})'; B[f'E{r}'] = src
    for c in 'BC': B[f'{c}{r}'].font = f_in
    for c in 'BCD': B[f'{c}{r}'].number_format = GBP
    B[f'A{r}'].font = f_base; B[f'D{r}'].font = f_base; B[f'E{r}'].font = f_note
    r += 1
B[f'A{r}'] = 'Contingency'; B[f'B{r}'] = 0.10; B[f'B{r}'].font = f_in; B[f'B{r}'].number_format = PCT
B[f'E{r}'] = 'Desk estimate'; B[f'E{r}'].font = f_note; rcont = r; r += 1
B[f'A{r}'] = 'Total build'; B[f'A{r}'].font = f_b
for c in 'BCD':
    B[f'{c}{r}'] = f'=SUM({c}5:{c}{r-2})*(1+$B${rcont})'; B[f'{c}{r}'].number_format = GBP; B[f'{c}{r}'].font = f_b; B[f'{c}{r}'].fill = fill_tot
rtot = r; r += 2
for c, t in zip('ABCDE', ['Paid for by', 'Low £', 'High £', 'Middle £', 'Source / label']):
    B[f'{c}{r}'] = t; B[f'{c}{r}'].font = f_sec; B[f'{c}{r}'].fill = fill_sec
r += 1; f0 = r
fund = [
    ('Supplier finance (Zappshelter package)', 87343, 87343, 'Indicative: Zappshelter HP, about £2,000 + VAT a month over 5 years (in the model)'),
    ('Grants via a CIC', 0, 0, 'None for Arena #1: it runs through the Ltd (Jamie, 29 Oct 2026). A CIC is considered for Arenas #2 and #3'),
    ('Sponsorship (boards, kit)', 0, 5000, 'Desk estimate: local business sponsors on the arena boards'),
]
for name, lo, hi, src in fund:
    B[f'A{r}'] = name; B[f'B{r}'] = lo; B[f'C{r}'] = hi; B[f'D{r}'] = f'=AVERAGE(B{r}:C{r})'; B[f'E{r}'] = src
    for c in 'BC': B[f'{c}{r}'].font = f_in
    for c in 'BCD': B[f'{c}{r}'].number_format = GBP
    B[f'A{r}'].font = f_base; B[f'E{r}'].font = f_note
    r += 1
B[f'A{r}'] = 'Still to find (cash or more grants)'; B[f'A{r}'].font = f_b
# low build vs high funding is best case; use matched columns for simplicity
for c in 'BCD':
    B[f'{c}{r}'] = f'=MAX(0,{c}{rtot}-SUM({c}{f0}:{c}{r-1}))'; B[f'{c}{r}'].number_format = GBP; B[f'{c}{r}'].font = f_b; B[f'{c}{r}'].fill = fill_tot
B[f'E{r}'] = 'Columns pair low build with low funding, high with high'; B[f'E{r}'].font = f_note
B.column_dimensions['A'].width = 48
for c in 'BCD': B.column_dimensions[c].width = 13
B.column_dimensions['E'].width = 80

# ---------------- Funding routes ----------------
FR = wb.create_sheet('Funding routes')
FR['A1'] = 'Funding routes: who applies, for what'; FR['A1'].font = f_h
FR['A2'] = 'Eligibility and amounts are unverified desk research (funder sites could not be checked from this session). Verify before relying on any line.'; FR['A2'].font = f_note
heads = ['Route', 'What it pays for', 'Who applies', 'Typical size', 'Status']
for i, t in enumerate(heads):
    c = FR.cell(row=4, column=i + 1, value=t); c.font = f_sec; c.fill = fill_sec
routes = [
    ('Supplier finance (Zappshelter HP or lease)', 'Canopy, covers, end walls, doors, install', 'Hoop Heroes Ltd (or CIC)', '~£2,000 + VAT/month over 5 years, or ~£3,000 over 3', 'Indicative (29 Oct 2026); terms, VAT and guarantee to confirm'),
    ('National Lottery Awards for All', 'Community sessions, kit, small capital', 'CIC', 'Up to £20,000', 'To verify; not open to profit-making companies'),
    ('Sport England Movement Fund', 'Projects getting inactive groups active, incl. kit', 'CIC', 'Up to £15,000 (often crowdfund-matched)', 'To verify'),
    ('Holiday Activities and Food (Buckinghamshire Council)', 'Free holiday places for eligible children', 'Hoop Heroes Ltd as approved provider', 'Per place per day', 'To verify rate and provider route'),
    ('PE and Sport Premium (paid by the school)', 'PE lesson support and teacher CPD (revenue only)', 'School buys from Hoop Heroes Ltd', '£6,240 + £10 per pupil per school a year', 'Actual (GOV.UK 2026/27); cannot fund the build'),
    ('Basketball England and wheelchair basketball funds', 'Basketball kit, sports wheelchairs, coach courses', 'CIC or affiliated club', 'Small grants', 'To verify'),
    ('Local council community grants, Section 106 / CIL', 'Facility capital in the community', 'CIC', 'Varies', 'To verify with Buckinghamshire Council'),
    ('Local business sponsorship', 'Arena boards, kit, team shirts', 'Hoop Heroes Ltd', '£500–£5,000 a year', 'Idea'),
]
for i, rr in enumerate(routes):
    for j, v in enumerate(rr):
        c = FR.cell(row=5 + i, column=j + 1, value=v); c.font = f_base; c.alignment = Alignment(wrap_text=True, vertical='top')
r = 5 + len(routes) + 1
FR[f'A{r}'] = 'How the two companies work together (proposal, for the accountant and solicitor)'; FR[f'A{r}'].font = f_b; r += 1
struct = [
    'DECIDED (Jamie, 29 Oct 2026): Arena #1 runs through Hoop Heroes Region 1 Ltd. Once it is open and proven, look at whether a CIC helps fund Arenas #2 and #3. Goal: three Arenas. The proposal below is for that later stage.',
    'Heroes Arena CIC (to be formed): holds the community side. Applies for grants, runs free and community sessions (SEND, wheelchair, girls-only, free sessions), and can hold kit and grant-funded parts of the building.',
    'Hoop Heroes Region 1 Ltd: runs the paid programme (memberships, parties, camps, breakfast, leagues, school PE support) and pays the CIC an arm\'s-length fee for its use of the space and kit.',
    'The school licenses the site to whichever body holds the Arena; the agreement allows assignment to the CIC later.',
    'Questions to settle first: the CIC asset lock; whether the sports-hire VAT exemption stops the CIC reclaiming VAT on the build; Flat Rate VAT limits for the Ltd; related-party rules and an independent CIC director.',
    'KB position (Project Overview v0.2, decision D1): "Ltd first", forming the CIC when a named grant needs it, is recommended and awaiting Jamie.',
]
for t in struct:
    FR[f'A{r}'] = t; FR[f'A{r}'].font = f_base; FR[f'A{r}'].alignment = Alignment(wrap_text=True, vertical='top')
    FR.merge_cells(f'A{r}:E{r}'); FR.row_dimensions[r].height = 32; r += 1
for c, w in zip('ABCDE', [42, 40, 30, 30, 40]):
    FR.column_dimensions[c].width = w

# ---------------- Read me ----------------
RM = wb.create_sheet('Read me', 0)
RM['A1'] = 'Heroes Arena 3-year model, v0.2 DRAFT (30 Oct 2026)'; RM['A1'].font = f_h
lines = [
    'Internal. Not for schools. A desk model for discussion, not a forecast, quote or advice.',
    '',
    'How to use it',
    '1. Summary: the 3-year picture against today in rented halls, with a chart.',
    '2. Assumptions: every input, with its source. Change the case in cell C3 (1 Downside, 2 Cautious, 3 Target).',
    '3. Monthly: 36 months from opening, built only from the Assumptions sheet.',
    '4. Build and funding: the build cost floor and how it might be paid for.',
    '5. Funding routes: which body applies for what, and how the CIC and the Ltd work together.',
    '',
    'Colours',
    'Blue text = an input you can change. Black = a formula. Yellow = the case selector.',
    '',
    'Labels (as in the KB)',
    'Actual = invoices or live systems. Indicative = a supplier\'s informal figure. List price = published price. Desk estimate = our own calculation. Jamie assumption = a figure Jamie set.',
]
for i, t in enumerate(lines):
    c = RM.cell(row=3 + i, column=1, value=t)
    c.font = f_b if t in ('How to use it', 'Colours', 'Labels (as in the KB)') else f_base
RM.column_dimensions['A'].width = 120

for ws in wb.worksheets:
    ws.sheet_view.showGridLines = ws.title in ('Monthly', 'Assumptions')
wb.save(OUT)
print('saved', OUT, R['sess'])
