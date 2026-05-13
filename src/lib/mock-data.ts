export interface Customer {
  id: string;
  name: string;
  phone: string;
  occasion: 'Birthday' | 'Anniversary' | 'Special';
  reminderDate: string;
  status: 'Active' | 'Paused' | 'Inactive';
  notes?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Completed' | 'Scheduled';
  sent: number;
  delivered: number;
  openRate: string;
  createdAt: string;
  message: string;
}

export interface Activity {
  id: string;
  event: string;
  detail: string;
  time: string;
  type: 'reminder' | 'campaign' | 'customer' | 'automation';
}

export interface ChartDataPoint {
  name: string;
  sent: number;
  delivered: number;
}

export interface UpcomingReminder {
  id: string;
  customerName: string;
  occasion: string;
  date: string;
  daysUntil: number;
  phone: string;
}

export const mockCustomers: Customer[] = [
  { id: '1', name: 'Alice Johnson', phone: '+1 555-0101', occasion: 'Birthday', reminderDate: 'Nov 15', status: 'Active', notes: 'Loves carrot cake' },
  { id: '2', name: 'Bob & Sarah Smith', phone: '+1 555-0102', occasion: 'Anniversary', reminderDate: 'Dec 1', status: 'Active', notes: '10th anniversary' },
  { id: '3', name: 'Charlie Brown', phone: '+1 555-0103', occasion: 'Special', reminderDate: 'Oct 31', status: 'Paused' },
  { id: '4', name: 'Diana Prince', phone: '+1 555-0104', occasion: 'Birthday', reminderDate: 'Jan 10', status: 'Inactive' },
  { id: '5', name: 'Eve & Tom Davis', phone: '+1 555-0105', occasion: 'Anniversary', reminderDate: 'Nov 20', status: 'Active', notes: 'Wedding anniversary' },
  { id: '6', name: 'Frank Miller', phone: '+1 555-0106', occasion: 'Birthday', reminderDate: 'Dec 5', status: 'Active', notes: 'Prefers gluten-free' },
  { id: '7', name: 'Grace Lee', phone: '+1 555-0107', occasion: 'Special', reminderDate: 'Nov 25', status: 'Paused' },
  { id: '8', name: 'Henry Wilson', phone: '+1 555-0108', occasion: 'Birthday', reminderDate: 'Oct 28', status: 'Active' },
  { id: '9', name: 'Ivy & James Taylor', phone: '+1 555-0109', occasion: 'Anniversary', reminderDate: 'Feb 14', status: 'Active', notes: 'Valentine\'s anniversary' },
  { id: '10', name: 'Jack Anderson', phone: '+1 555-0110', occasion: 'Birthday', reminderDate: 'Dec 15', status: 'Inactive' },
  { id: '11', name: 'Karen White', phone: '+1 555-0111', occasion: 'Birthday', reminderDate: 'Nov 8', status: 'Active', notes: 'Chocolate lover' },
  { id: '12', name: 'Leo & Maria Garcia', phone: '+1 555-0112', occasion: 'Anniversary', reminderDate: 'Dec 22', status: 'Active', notes: '25th anniversary - gold tier' },
];

export const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Holiday Cake Collection',
    status: 'Active',
    sent: 284,
    delivered: 271,
    openRate: '87%',
    createdAt: 'Nov 1, 2024',
    message: 'Hi {name}! The holidays are coming and Sweet Crumbs has something special for you. Browse our holiday cake collection and order by Dec 20 to guarantee delivery. Use code HOLIDAY15 for 15% off!'
  },
  {
    id: '2',
    name: 'New Year Countdown',
    status: 'Scheduled',
    sent: 0,
    delivered: 0,
    openRate: '-',
    createdAt: 'Nov 5, 2024',
    message: 'Happy New Year, {name}! Celebrate with our special New Year cake collection. Book your cake now!'
  },
  {
    id: '3',
    name: "Valentine's Day Special",
    status: 'Draft',
    sent: 0,
    delivered: 0,
    openRate: '-',
    createdAt: 'Nov 8, 2024',
    message: "Love is in the air and so is the smell of fresh pastries! Get your Valentine's cake from Sweet Crumbs."
  },
  {
    id: '4',
    name: 'Summer Fruit Tarts',
    status: 'Completed',
    sent: 500,
    delivered: 488,
    openRate: '92%',
    createdAt: 'Jun 15, 2024',
    message: 'Summer is here! Try our fresh fruit tarts made with seasonal berries.'
  },
  {
    id: '5',
    name: 'Birthday Club Launch',
    status: 'Completed',
    sent: 180,
    delivered: 176,
    openRate: '94%',
    createdAt: 'Aug 1, 2024',
    message: 'Join our Birthday Club and get 20% off on your birthday month!'
  },
];

export const mockActivity: Activity[] = [
  { id: '1', event: 'Birthday reminder sent', detail: 'Alice Johnson — Birthday on Nov 15', time: '2 hours ago', type: 'reminder' },
  { id: '2', event: 'Campaign activated', detail: '"Holiday Cake Collection" is now live', time: '5 hours ago', type: 'campaign' },
  { id: '3', event: 'New customer added', detail: 'Karen White joined via sign-up form', time: '1 day ago', type: 'customer' },
  { id: '4', event: 'Anniversary reminder sent', detail: 'Eve & Tom Davis — Anniversary Nov 20', time: '1 day ago', type: 'reminder' },
  { id: '5', event: 'Automation updated', detail: 'Birthday Reminder now sends 3 days early', time: '2 days ago', type: 'automation' },
  { id: '6', event: 'Customer status changed', detail: 'Diana Prince marked inactive', time: '3 days ago', type: 'customer' },
  { id: '7', event: 'Campaign completed', detail: '"Summer Fruit Tarts" — 92% delivery rate', time: '5 months ago', type: 'campaign' },
];

export const mockChartData: ChartDataPoint[] = [
  { name: 'Jun', sent: 120, delivered: 114 },
  { name: 'Jul', sent: 180, delivered: 172 },
  { name: 'Aug', sent: 240, delivered: 228 },
  { name: 'Sep', sent: 310, delivered: 298 },
  { name: 'Oct', sent: 280, delivered: 265 },
  { name: 'Nov', sent: 420, delivered: 401 },
];

export const mockUpcomingReminders: UpcomingReminder[] = [
  { id: '1', customerName: 'Henry Wilson', occasion: 'Birthday', date: 'Oct 28', daysUntil: 2, phone: '+1 555-0108' },
  { id: '2', customerName: 'Charlie Brown', occasion: 'Special Occasion', date: 'Oct 31', daysUntil: 5, phone: '+1 555-0103' },
  { id: '3', customerName: 'Karen White', occasion: 'Birthday', date: 'Nov 8', daysUntil: 13, phone: '+1 555-0111' },
  { id: '4', customerName: 'Alice Johnson', occasion: 'Birthday', date: 'Nov 15', daysUntil: 20, phone: '+1 555-0101' },
  { id: '5', customerName: 'Eve & Tom Davis', occasion: 'Anniversary', date: 'Nov 20', daysUntil: 25, phone: '+1 555-0105' },
];

export const mockTestimonials = [
  {
    id: '1',
    name: 'Maria Santos',
    business: 'Maria\'s Patisserie, Austin TX',
    avatar: 'MS',
    text: 'BakeryPing completely transformed how I connect with customers. My repeat orders increased by 40% within 3 months. The birthday reminders alone paid for the entire subscription.',
    rating: 5,
  },
  {
    id: '2',
    name: 'David Chen',
    business: 'Golden Crust Bakery, Seattle WA',
    avatar: 'DC',
    text: 'I used to manually text every customer. Now BakeryPing handles it automatically while I focus on baking. My customers love the personal touch — they don\'t even realize it\'s automated.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Priya Patel',
    business: 'Sweet Dreams Confectionery, Boston MA',
    avatar: 'PP',
    text: 'The WhatsApp integration is seamless. My customers respond directly and we have real conversations. It feels like I\'m personally reaching out, but it takes me zero time.',
    rating: 5,
  },
];

export const mockFaqs = [
  {
    q: 'How does WhatsApp integration work?',
    a: 'BakeryPing connects to your WhatsApp Business account via a secure QR code scan. Once connected, reminders are sent directly from your WhatsApp number — so customers see a message from a familiar contact.',
  },
  {
    q: 'Can I customize the reminder messages?',
    a: 'Yes! Every message template is fully customizable. Add your bakery name, personalize with the customer\'s name, include special offers, and add your business hours or contact details.',
  },
  {
    q: 'How many customers can I add?',
    a: 'Plans scale with your bakery. The Starter plan supports up to 100 customers, Growth up to 500, and Pro offers unlimited customers. You can upgrade or downgrade anytime.',
  },
  {
    q: 'What happens if my WhatsApp session expires?',
    a: 'We\'ll notify you immediately via email and in-app alert. Re-connecting takes under 30 seconds — just scan the new QR code in the Automations page.',
  },
  {
    q: 'Is my customer data secure?',
    a: 'Absolutely. We use end-to-end encryption, are GDPR compliant, and never sell or share your customer data. Your data is stored securely on servers in your region.',
  },
];

export const mockPricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: 'month',
    description: 'Perfect for small bakeries just getting started.',
    features: [
      'Up to 100 customers',
      '3 campaign templates',
      'Birthday & anniversary reminders',
      'WhatsApp Business connection',
      'Basic analytics',
      'Email support',
    ],
    popular: false,
    cta: 'Start free trial',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 59,
    period: 'month',
    description: 'For growing bakeries ready to scale their outreach.',
    features: [
      'Up to 500 customers',
      'Unlimited campaigns',
      'All occasion types',
      'Custom message templates',
      'Advanced analytics & reports',
      'Bulk customer import (CSV)',
      'Priority support',
    ],
    popular: true,
    cta: 'Start free trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    period: 'month',
    description: 'For established bakeries with high-volume needs.',
    features: [
      'Unlimited customers',
      'Multi-location support',
      'API access',
      'White-label messages',
      'Custom automation rules',
      'Dedicated account manager',
      '99.9% uptime SLA',
    ],
    popular: false,
    cta: 'Contact sales',
  },
];
