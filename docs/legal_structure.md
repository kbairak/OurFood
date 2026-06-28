# FairBite Legal Structure (Greece)

## Greek Social Cooperative Enterprises (ΚοινΣΕπ)

Greece's **Law 4430/2016** (as amended by Law 5078/2023) establishes Social
Cooperative Enterprises (Κοινωνικές Συνεταιριστικές Επιχειρήσεις - ΚοινΣΕπ) as
part of the Social & Solidarity Economy framework. FairBite fits as a **Type C
ΚοινΣΕπ** (Collective and Productive Purpose), which targets collective needs
through local product utilization, preservation of traditional activities, and
public utility services. Requirements: minimum 5 members, one member = one vote
principle, no profit distribution to members (only to employees, max 35%),
multi-stakeholder governance explicitly supported ("producers, users, and
community representatives"). As of July 2023, 1,870 active SSE entities exist in
Greece with growing institutional support from the Special Secretariat for SSE
and 11 regional SSE Unions.

---

## Ideal Governance Structure

This describes how FairBite would operate if Greek law permitted all desired
mechanisms.

### Membership & Joining

- **Merchants & Couriers:** Physical signature on Articles of Association
- **Consumers:** Electronic signature via app (TaxisNet/gov.gr for identity
  verification), weighted voting power based on recent order activity

### General Assembly

- **Annual GA required** (minimum once/year for board elections, annual report)
- **Trigger threshold:** 20% of total weighted voting power (33% merchants + 33%
  couriers + 33% consumers) can call GA at any time via app
- **Meeting format:** Online via video conference, voting window stays open 72
  hours after meeting

### Voting Mechanism

Each stakeholder class votes separately on issues. Final outcome calculated as:

- 33% × merchant class result + 33% × courier class result + 33% × consumer
  class result

**Example:** Merchants vote 70% Yes, couriers 40% Yes, consumers 90% Yes →
Final: 66% Yes (motion passes)

Consumer voting power weighted by activity (e.g., exponential decay based on
days since last order) to prevent dormant account manipulation.

### Board Composition (7 Members)

- **2 Merchant representatives** (elected by merchant class)
- **2 Courier representatives** (elected by courier class)
- **2 Consumer representatives** (lottery selection from interested pool)
- **1 CEO** (operational authority, tie-breaker)

Board handles operational decisions (hiring, vendors, marketing, features). GA
handles structural decisions (fees, major partnerships, Articles amendments,
budget, board elections).

**Term length:** 1-2 years with staggered terms (Year 1: all 7 elected; Year 2:
4 seats; Year 3: 3 seats; repeat)

### CEO Role Clarification

- Management gets **0% voting power in GA** and **0% ownership stake**
- CEO holds **1 board seat (1/7 votes)** for operational authority and
  accountability
- CEO can be removed easily via 20% GA trigger threshold
- CEO cannot vote on own appointment, compensation, or removal

### Challenges with Ideal Structure

**1. Ballot Control**

Someone must draft ballot questions after GA is triggered. Management control
creates manipulation risk via framing effects ("Should we increase merchant fees
to fund courier benefits?" vs "Should we adjust fees?").

**Solution:** Board approves all ballot language before it goes to members
(2+2+2+1 structure means CEO can't approve alone). Fallback to good faith +
threat of CEO removal.

**2. Consumer Weighting Formula**

Need specific formula for activity weighting. Options:

- Linear: `weight = min(1, orders_last_90_days / 5)`
- Exponential: `weight = 0.5^(days_since_last_order / 30)`
- Step function with minimum floor (e.g., 0.1)

**3. Empty Lottery Pool**

If zero consumers express board interest:

- Extend candidacy window and re-lottery?
- Board operates with 5 members temporarily?
- Other classes elect consumer representatives?

**4. Quorum Requirements**

Minimum participation required for vote validity (TBD)

---

## Incompatibility with Greek Law

Greek cooperative law (Law 4430/2016) creates several conflicts with the ideal
structure.

### Issue 1: One Member = One Vote Requirement

**The conflict:**

- Greek law mandates "one member = one vote" across ALL members in General
  Assembly
- FairBite needs 33/33/33 class-based voting where each class has equal power
  regardless of size

**Severity:** CRITICAL - Fundamental to the governance model

**Possible solutions:**

**Option A: Board-Focused Governance**

- Minimize GA power, maximize board power (where class quotas work)
- Board handles most decisions (operational matters)
- GA handles only major structural changes (fees, Articles amendments, budget)
- Since board has 2+2+2+1 structure, daily governance maintains 33/33/33 balance
- **Risk:** May not satisfy legal requirement for GA sovereignty

**Option B: Class-Based Board Elections Only**

- GA operates strictly one-person-one-vote for all decisions
- Each stakeholder class elects their board representatives internally
- Board composition (2+2+2) maintains class balance
- **Trade-off:** Consumers could outvote merchants/couriers on major GA
  decisions

**Option C: Recommended Ratification**

- Class-based votes calculated and "recommended" to GA
- GA votes to ratify or reject
- **Risk:** Courts may view as circumventing legal requirement; unclear what
  happens when GA rejects class-vote result

### Issue 2: Multiple Membership Prohibition

**The conflict:**

- Members of one ΚοινΣΕπ **cannot be members of another ΚοινΣΕπ**
- Enforced during registration via statutory declarations

**Severity:** MODERATE - May limit membership pool

**Unknown scope:**

- Does prohibition extend to **all cooperative types** (agricultural, housing,
  credit unions) or only ΚοινΣΕπ?
- If restricted to ΚοινΣΕπ only: not a major issue (prevents competing food
  delivery coops)
- If applies to all coops: **CATASTROPHIC** (many merchants/consumers may be in
  other cooperatives)

**Critical need:** Lawyer clarification on exact scope of prohibition

### Issue 3: Board Structure Requirements

**Greek law mandates:**

- Board must have **President, Secretary, and Treasurer** (3 designated
  positions)
- These roles elected by board members from among themselves (not by GA
  directly)
- Total board size must be **odd number**
- Board positions are **unpaid**

**Impact on FairBite:**

- 7-member board: 3 designated positions + 4 additional members
- No conflict with ideal structure (already using odd number)
- President/Secretary/Treasurer roles must be filled

**Open question:** Can CEO become President? (concentrated power concern)

### Issue 4: Management Voting Rights

**The conflict:**

- Board positions must be **unpaid** (Greek law)
- Board members elected by General Assembly
- FairBite ideal: CEO holds 1 board seat

**Severity:** LOW - Solvable with role separation

**Solution:**

- CEO is paid **employee** + unpaid **board member** (dual roles)
- Common in cooperatives; employment relationship separate from governance role
- **OR** CEO attends board as non-voting advisor/observer (sacrifices
  tie-breaking ability)

### Issue 5: Lottery Selection for Board

**The conflict:**

- No evidence Greek law explicitly permits lottery-based selection in Articles
  of Association
- No precedent found for sortition in modern Greek cooperatives
- Unclear if GA ratification legitimizes non-election selection

**Severity:** MODERATE - Alternative methods exist

**Questions for lawyer:**

- Can Articles specify lottery as election method for specific class?
- Transparency/verifiability requirements for legal compliance?

**Fallback:** Traditional election among consumers (popularity contest problem,
low turnout likely)

### Issue 6: Digital Governance

**The conflict:**

- Electronic signatures ✓ recognized (Law 4727/2020, eIDAS Regulation)
- Digital voting ❌ no specific provisions in Law 4430/2016
- Remote GA meetings ❌ no specific provisions

**Severity:** HIGH - Affects entire platform design

**Unknowns:**

- Can members join cooperative with e-signature only (no physical paperwork)?
- Can GA meetings be held fully remote (via video/app)?
- Can votes be cast through app instead of physical presence?
- COVID-19 precedent: Did temporary remote meeting provisions become permanent?

**Critical need:** Legal consultation before building app features that may not
be legally valid

---

## Next Steps

### Critical Legal Questions (MUST consult lawyer)

1. **Multiple membership:** Does prohibition apply only to multiple ΚοινΣΕπ or
   all cooperatives? If all coops, this severely limits membership.

2. **Class-based voting:** Can Articles implement 33/33/33 weighting within "one
   member = one vote" constraint? Any precedent from other multi-stakeholder
   ΚοινΣΕπ?

3. **Digital governance:** Are e-signatures, remote GAs, and app-based voting
   legally valid for ΚοινΣΕπ?

4. **Lottery selection:** Can Articles specify lottery as board election method
   for consumer class?

5. **Board vs GA authority:** Can Articles grant most operational decisions to
   Board, reserving only structural changes for GA?

6. **CEO dual role:** Legal issues with CEO as paid employee + unpaid board
   member?

### Research & Planning

- [ ] Find Greek cooperative lawyer specializing in ΚοινΣΕπ and
      multi-stakeholder governance
- [ ] Research precedent: Existing multi-stakeholder ΚοινΣΕπ with class-based
      representation
- [ ] Research COVID-era changes: Did remote meeting provisions become
      permanent?
- [ ] Determine founding members (need 5 minimum from different stakeholder
      classes)
- [ ] Calculate registration costs, timeline, required documentation
- [ ] Decide registration location (Patras? Athens?)

### Alternative Governance Models (if ideal structure violates Greek law)

- **6-member board (2+2+2, no management)** - Accept ties force consensus
- **Rotating 7th seat** - Extra board seat rotates annually between classes
- **Consumer delegation model** - Consumers elect representatives to "Consumer
  Council" which elects 2 board members
- **Hybrid legal structure** - Combine ΚοινΣΕπ with other legal entities if
  needed
- **Board-focused governance** - Minimize GA power, maximize board power (where
  class quotas enforced)

### Courier Equipment & Employment Structure

**Question:** Should couriers bring their own bikes or should the coop provide them?

**Arguments for coop-provided bikes:**

- Aligns with whitepaper commitment to "fair compensation with benefits, insurance,
  equipment" and "middle-class stability, not gig poverty"
- Removes barrier to entry (anyone can join without capital investment)
- Equalizes working conditions across all couriers
- Reinforces worker-ownership principle (couriers own means of production)
- Creates branding/visibility opportunity with uniform equipment
- Couriers (33% voting power) would likely vote for this option

**Arguments for courier-owned bikes:**

- Reduces upfront capital costs for the coop
- Provides flexibility for couriers who already own equipment
- May reduce maintenance/liability burden

**Hybrid option:**

- Coop provides bikes to all who need them
- Couriers with their own bikes can use them with maintenance/depreciation stipend
- Balances inclusivity with flexibility

**Dependencies:**

- Funding model decision (Phase 0 priority)
- Employee vs contractor classification (affects legal obligations)
- Insurance requirements for equipment
- Storage/maintenance infrastructure costs

**Decision timeline:** Must resolve before Phase 1 sandbox launch (courier
recruitment)

### Regulatory Compliance (separate from governance)

- Food safety regulations
- Labor law for courier employment (employee vs contractor classification)
- Data protection (GDPR)
- Payment processing licenses

---

## Sources

### Primary Legal Framework

- [Law 4019/2011 on Social Economy](https://www.socioeco.org/bdf_fiche-legislation-67_en.html)
- [Law 4430/2016 - Codified Version with Law 5078/2023](https://www.taxheaven.gr/law/4430/2016)
- [Legal Provisions for SSE - Law 4430/2016 (Academic Paper)](https://www.academia.edu/40189623/LEGAL_PROVISIONS_FOR_SOCIAL_AND_SOLIDARITY_ECONOMY_ACTORS_THE_CASE_OF_LAW_4430_2016_IN_GREECE)

### Technical Analysis

- [CICOPA Technical Brief on Greek SSE Law](https://www.cicopa.coop/publications/technical-brief-on-the-greek-sse-law-and-cooperative/)
- [Greece Legal Framework Analysis - ICA-EU Partnership](https://coops4dev.coop/sites/default/files/2021-03/Greece%20Legal%20Framework%20Analysis%20Report%20.pdf)
- [EU Social Enterprises Report - Greece](https://ec.europa.eu/social/BlobServlet?docId=21741&langId=en)
- [Multi-stakeholder Governance Research](https://resources.uwcc.wisc.edu/Multistakeholder/Multi-stakeholder_Governance.pdf)

### Governance & Board Structure

- [ΚοινΣΕπ Board Composition Requirements (Greek)](https://www.taxhorizon.club/el/%CE%B5%CF%81%CE%B3%CE%B1%CE%BB%CE%B5%CE%AF%CE%B1-8/%CF%80%CE%B5%CF%81%CE%AF-%CE%B5%CF%84%CE%B1%CE%B9%CF%81%CE%B5%CE%B9%CF%8E%CE%BD-81/%CE%BA%CE%BF%CE%B9%CE%BD-%CF%83-%CE%B5%CF%80-%CE%BA%CE%BF%CE%B9%CE%BD%CF%89%CE%BD%CE%B9%CE%BA%CE%AD%CF%82-%CF%83%CF%85%CE%BD%CE%B5%CF%84%CE%B1%CE%B9%CF%81%CE%B9%CF%83%CF%84%CE%B9%CE%BA%CE%AD%CF%82-%CE%B5%CF%80%CE%B9%CF%87%CE%B5%CE%B9%CF%81%CE%AE%CF%83%CE%B5%CE%B9%CF%82-21367)
- [ΚοινΣΕπ Formation Guide (Greek, PDF)](https://kalo.gov.gr/wp-content/uploads/2019/05/2.-%CE%A3%CE%A5%CE%9D%CE%A4%CE%9F%CE%9C%CE%9F%CE%A3-%CE%9F%CE%94%CE%97%CE%93%CE%9F%CE%A3-%CE%93%CE%99%CE%91-%CE%A4%CE%97-%CE%A3%CE%A5%CE%A3%CE%A4%CE%91%CE%A3%CE%97-%CE%9A%CE%91%CE%99-%CE%9B%CE%95%CE%99%CE%A4%CE%9F%CE%A5%CE%A1%CE%93%CE%99%CE%91-%CE%9A%CE%9F%CE%99%CE%9D%CE%A3%CE%95%CE%A0-%CE%A3%CE%A5%CE%9D.%CE%95%CE%A1%CE%93..pdf)
- [ΚοινΣΕπ Formation Guide (Greek, Alternative)](https://koinonikoepixeiro.eu/wp-content/uploads/2021/12/info-about-KoinSEp-2.pdf)
- [ΚοινΣΕπ Setup Guide - KSTLaw (Greek)](https://kstlaw.gr/%CE%BA%CE%BF%CE%B9%CE%BD%CF%83%CE%B5%CF%80-%CE%B9%CE%B4%CF%81%CF%85%CF%83%CE%B7-%CE%BB%CE%B5%CE%B9%CF%84%CE%BF%CF%85%CF%81%CE%B3%CE%AF/)

### Digital Governance & E-Signatures

- [Electronic Signatures in Greece - PandaDoc](https://www.pandadoc.com/electronic-signature-law/greece/)
- [E-Signature Regulations - Greece - Ally Law](https://ally-law.com/e-signature-regulations-greece/)
- [Greek Legal Framework - Electronic vs Digital Signatures](https://www.law-services.gr/legal-articles-and-media/business-corporate-law/greek-legal-framework-electronic-signatures-vs-digital-signatures-diving-into-the-special-features-of-esignatures/)

### Current Landscape & Policy

- [Greece - EU Social Economy Gateway](https://social-economy-gateway.ec.europa.eu/my-country/greece_en)
- [OECD Social Economy in Europe - Greece](https://www.oecd.org/en/publications/social-economy-in-europe_12970cca-en/greece_6dfa627b-en.html)
- [Neoliberalisation and SSE in Greece (2021)](https://blogs.lse.ac.uk/greeceatlse/2021/12/15/neoliberalisation-and-the-social-and-solidarity-economy-in-greece/)

### Democratic Selection

- [Sortition in Ancient Greece - OUP Blog](https://blog.oup.com/2016/03/sortition-ancient-greece-democracy/)
- [Sortition - Wikipedia](https://en.wikipedia.org/wiki/Sortition)
