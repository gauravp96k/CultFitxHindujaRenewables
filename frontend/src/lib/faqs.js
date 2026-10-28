/*
 * Employee FAQs — text taken from docs/Cult.Fit FAQs.docx.
 * Each answer is a list of blocks:
 *   { p: 'text', strong?: true }   paragraph (strong = shown in bold, as in the document)
 *   { list: ['item', …] }          bulleted list
 *   { tips: [['Title', 'text'], …] } short titled points
 */
export const FAQS = [
  {
    q: 'What is the HREPL Zings – cult.fit Corporate Membership?',
    a: [
      { p: 'It is a voluntary employee wellbeing benefit that gives eligible HREPL employees the opportunity to enrol for selected cult.fit memberships at preferential corporate rates.' },
      { p: 'The idea is simple: make fitness more accessible, convenient and easier to build into your everyday life.', strong: true },
    ],
  },
  {
    q: 'What makes the corporate membership attractive?',
    a: [
      { p: 'Apart from access to the applicable cult.fit offering under your selected plan, HREPL is making participation easier in two ways:' },
      {
        list: [
          'You get access to the preferential corporate membership rate available under the programme.',
          "You don't have to pay the entire membership fee upfront. HREPL will facilitate the payment, and your applicable membership fee will be recovered from salary in six monthly instalments.",
        ],
      },
      { p: 'So you can get started on your fitness journey while spreading the cost comfortably across six months.' },
    ],
  },
  {
    q: 'How will I pay for my membership?',
    a: [
      { p: 'Once you enroll, the applicable membership amount will be recovered from your salary through six monthly payroll deductions.', strong: true },
      { p: 'You will therefore not need to pay the full membership amount upfront.' },
      { p: 'The exact membership amount and corresponding monthly deduction will be communicated as part of the enrolment process.' },
      { p: 'Example: If your total payable membership amount is ₹12,000, the indicative recovery would be ₹2,000 per month for six months, subject to any final rounding adjustment.', strong: true },
    ],
  },
  {
    q: 'When will my membership become active?',
    a: [
      { p: 'Once you have successfully enrolled and completed the required information and authorizations, your membership is expected to be activated within three weeks.', strong: true },
      { p: "We will work towards completing activations within this period. In exceptional situations outside HREPL's control, such as service-provider or other external operational circumstances, activation may take longer." },
    ],
  },
  {
    q: 'Who can enroll?',
    a: [
      { p: 'The programme is available to eligible HREPL employees who meet the communicated eligibility requirements, complete their enrolment within the enrolment window and provide the required declarations, consents and payroll-deduction authorization.' },
      { p: 'Employees who are currently serving their notice period are not eligible to enroll.' },
    ],
  },
  {
    q: 'Is participation mandatory?',
    a: [
      { p: 'Not at all.' },
      { p: 'The programme is completely voluntary. You can choose whether the membership works for you based on your fitness preferences, location and personal circumstances.', strong: true },
      { p: 'Choosing not to participate will not affect your compensation, performance assessment, career progression or other employment benefits.' },
    ],
  },
  {
    q: 'How do I enroll?',
    a: [
      { p: 'Simply complete the designated enrolment process within the communicated enrolment window.' },
      { p: 'As part of enrolment, you will be asked to:' },
      {
        list: [
          'select the available membership option and applicable location/city;',
          'provide the information required for activation;',
          'provide the required declarations and consents; and',
          'authorize recovery of the membership amount through payroll.',
        ],
      },
      { p: 'Once the required process is complete, your details will be processed for membership activation.' },
    ],
  },
  {
    q: 'Can I enroll now and cancel later?',
    a: [
      { p: 'Please enroll only if you are comfortable committing to the membership.' },
      { p: 'Once your enrolment has been submitted to the service provider or the membership has been activated, it will ordinarily be non-cancellable and non-refundable, subject to the applicable terms and any specifically approved exception.', strong: true },
      { p: 'The membership is also personal to you and cannot be transferred, sold or shared with someone else.' },
    ],
  },
  {
    q: "What if I don't use the gym regularly after enrolling?",
    a: [
      { p: 'We hope you make the most of your membership, but usage is ultimately your choice.' },
      { p: "Since the membership is purchased based on your voluntary enrolment, payroll deductions will continue even if you don't use the membership regularly, subject to any exception specifically approved in writing.", strong: true },
      { p: 'Think of enrolling as making a commitment to your membership for the applicable subscription period.' },
    ],
  },
  {
    q: 'What happens if I leave HREPL before all six deductions are completed?',
    a: [
      { p: 'If your employment ends before the membership amount has been fully recovered, the remaining outstanding amount will become payable and recovered in full from you.', strong: true },
      { p: 'Subject to applicable requirements, the balance may be adjusted against amounts payable to you, including your final settlement, or you may be asked to pay the outstanding amount directly.' },
      { p: "Your membership access after separation will be governed by cult.fit's applicable conditions." },
    ],
  },
  {
    q: 'Can I transfer my membership to a colleague, friend or family member?',
    a: [
      { p: "No. The corporate membership is intended for the enrolled employee's personal use and cannot be transferred, sold, lent or shared with another person.", strong: true },
    ],
  },
  {
    q: 'Can my family members or dependants enroll under this programme?',
    a: [
      { p: 'No. The current programme is intended for employees who meet the communicated eligibility criteria. Family members and dependants are not covered unless HREPL specifically communicates otherwise.' },
    ],
  },
  {
    q: 'Will HREPL monitor how often I work out?',
    a: [
      { p: 'Your fitness journey is personal.', strong: true },
      { p: 'HREPL may receive limited information needed to administer the programme, such as enrolment and activation information, payment reconciliation information and, where applicable, programme-level participation or usage information.' },
      { p: 'Importantly, your gym attendance, workout frequency, activity levels or similar fitness information will not be used to assess your work performance, compensation, promotion, career progression or continued employment.', strong: true },
    ],
  },
  {
    q: "What if I have an existing medical condition or haven't exercised in a while?",
    a: [
      { p: 'Your wellbeing comes first.' },
      { p: 'You are responsible for assessing whether a particular fitness activity is suitable for you. If you have a pre-existing condition, recent illness or injury, pregnancy-related consideration, medical restriction, or simply have doubts about starting an exercise programme, you should seek advice from a qualified medical practitioner before participating.' },
      { p: 'And if you experience pain, dizziness, breathing difficulty or unusual discomfort while exercising, stop the activity and seek appropriate assistance.' },
    ],
  },
  {
    q: 'What if I face an issue with my membership, booking, centre or cult.fit app?',
    a: [
      { p: "Service-related matters such as centre access, bookings, classes, trainer-related concerns, equipment, app issues and membership activation should first be raised through cult.fit's designated support channel." },
    ],
  },
  {
    q: 'Does HREPL reimburse travel or other expenses for visiting a cult.fit centre?',
    a: [
      { p: 'No. Employees are responsible for their own travel and related arrangements when using the membership. Travel, food and other associated personal expenses are not reimbursable under this programme.' },
    ],
  },
  {
    q: 'Are specific centres, classes or time slots guaranteed?',
    a: [
      { p: 'Availability of centres, classes, trainers, facilities, schedules and time slots is managed by cult.fit and may change from time to time.' },
      { p: 'Before enrolling, employees should consider whether the applicable membership and available locations are suitable for their needs.' },
    ],
  },
  {
    q: 'What should I remember before clicking “Enroll”?',
    a: [
      { p: 'Just three things:' },
      {
        tips: [
          ['Choose consciously.', 'Select the membership only if it works for your location and personal fitness plans.'],
          ['Plan for six deductions.', 'You are committing to recovery of the membership amount through six monthly payroll deductions.'],
          ['Make it count.', 'Once you enrol, make the membership part of your routine and use the opportunity to invest in your wellbeing.'],
        ],
      },
    ],
  },
];
