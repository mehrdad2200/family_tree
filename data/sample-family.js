/**
 * خانواده نمونه — خانواده آزادگان
 * برای نمایش اولیه برنامه وقتی هیچ پروژه‌ای وجود ندارد
 */

window.SAMPLE_FAMILY = {
  project: {
    id: 'sample-azadegan',
    name: 'خانواده آزادگان',
    description: 'شجره‌نامه نمونه خاندان آزادگان — برای آشنایی با امکانات برنامه',
    theme: 'forest',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  },
  people: [
    // نسل ۱ — پدربزرگ و مادربزرگ پدری
    {
      id: 'p1',
      projectId: 'sample-azadegan',
      firstName: 'حسن',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۲۸۵',
      deathDate: '۱۳۵۸',
      birthPlace: 'اردبیل',
      occupation: 'کشاورز',
      confidence: 'certain',
      bio: 'بنیان‌گذار خانواده آزادگان در اردبیل. مردی سخت‌کوش و محترم.'
    },
    {
      id: 'p2',
      projectId: 'sample-azadegan',
      firstName: 'زهرا',
      lastName: 'موسوی',
      gender: 'female',
      birthDate: '۱۲۹۰',
      deathDate: '۱۳۶۵',
      birthPlace: 'اردبیل',
      occupation: 'خانه‌دار',
      confidence: 'certain',
      bio: 'همسر حسن آزادگان. مادری مهربان و حافظ سنت‌های خانوادگی.'
    },
    // نسل ۱ — پدربزرگ و مادربزرگ مادری
    {
      id: 'p3',
      projectId: 'sample-azadegan',
      firstName: 'علی‌اکبر',
      lastName: 'رضایی',
      gender: 'male',
      birthDate: '۱۲۸۸',
      deathDate: '۱۳۶۲',
      birthPlace: 'تبریز',
      occupation: 'بازرگان',
      confidence: 'certain'
    },
    {
      id: 'p4',
      projectId: 'sample-azadegan',
      firstName: 'فاطمه',
      lastName: 'کاظمی',
      gender: 'female',
      birthDate: '۱۲۹۲',
      deathDate: '۱۳۷۰',
      birthPlace: 'تبریز',
      occupation: 'خانه‌دار',
      confidence: 'certain'
    },
    // نسل ۲ — فرزندان حسن و زهرا
    {
      id: 'p5',
      projectId: 'sample-azadegan',
      firstName: 'علی',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۳۱۵',
      deathDate: '۱۳۹۸',
      birthPlace: 'اردبیل',
      occupation: 'معلم',
      confidence: 'certain',
      bio: 'پسر ارشد حسن. سال‌ها در آموزش‌وپرورش خدمت کرد و سپس به تهران مهاجرت نمود.'
    },
    {
      id: 'p6',
      projectId: 'sample-azadegan',
      firstName: 'رضا',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۳۱۸',
      deathDate: '',
      birthPlace: 'اردبیل',
      occupation: 'مهندس',
      confidence: 'certain',
      bio: 'در قید حیات. ساکن اصفهان.'
    },
    {
      id: 'p7',
      projectId: 'sample-azadegan',
      firstName: 'مریم',
      lastName: 'آزادگان',
      gender: 'female',
      birthDate: '۱۳۲۲',
      deathDate: '',
      birthPlace: 'اردبیل',
      occupation: 'پرستار',
      confidence: 'certain'
    },
    // همسر علی
    {
      id: 'p8',
      projectId: 'sample-azadegan',
      firstName: 'نرگس',
      lastName: 'رضایی',
      gender: 'female',
      birthDate: '۱۳۲۰',
      deathDate: '۱۴۰۰',
      birthPlace: 'تبریز',
      occupation: 'خانه‌دار',
      confidence: 'certain',
      bio: 'دختر علی‌اکبر رضایی. همسر علی آزادگان.'
    },
    // نسل ۳ — فرزندان علی و نرگس
    {
      id: 'p9',
      projectId: 'sample-azadegan',
      firstName: 'حسین',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۳۴۲',
      deathDate: '',
      birthPlace: 'تهران',
      occupation: 'پزشک',
      confidence: 'certain',
      bio: 'فرزند اول علی و نرگس. متخصص داخلی.'
    },
    {
      id: 'p10',
      projectId: 'sample-azadegan',
      firstName: 'سارا',
      lastName: 'آزادگان',
      gender: 'female',
      birthDate: '۱۳۴۵',
      deathDate: '',
      birthPlace: 'تهران',
      occupation: 'معمار',
      confidence: 'certain'
    },
    {
      id: 'p11',
      projectId: 'sample-azadegan',
      firstName: 'محمد',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۳۴۸',
      deathDate: '',
      birthPlace: 'تهران',
      occupation: 'وکیل',
      confidence: 'certain'
    },
    // همسر حسین
    {
      id: 'p12',
      projectId: 'sample-azadegan',
      firstName: 'لیلا',
      lastName: 'احمدی',
      gender: 'female',
      birthDate: '۱۳۴۴',
      deathDate: '',
      birthPlace: 'اصفهان',
      occupation: 'معلم',
      confidence: 'certain'
    },
    // نسل ۴ — نوه‌ها
    {
      id: 'p13',
      projectId: 'sample-azadegan',
      firstName: 'آرمین',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۳۷۰',
      deathDate: '',
      birthPlace: 'تهران',
      occupation: 'برنامه‌نویس',
      confidence: 'certain',
      bio: 'نوه علی آزادگان. علاقه‌مند به تاریخ خانواده.'
    },
    {
      id: 'p14',
      projectId: 'sample-azadegan',
      firstName: 'نیلوفر',
      lastName: 'آزادگان',
      gender: 'female',
      birthDate: '۱۳۷۳',
      deathDate: '',
      birthPlace: 'تهران',
      occupation: 'طراح گرافیک',
      confidence: 'certain'
    },
    {
      id: 'p15',
      projectId: 'sample-azadegan',
      firstName: 'کیان',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۳۷۸',
      deathDate: '',
      birthPlace: 'تهران',
      occupation: 'دانشجو',
      confidence: 'certain'
    },
    // فرزندان رضا
    {
      id: 'p16',
      projectId: 'sample-azadegan',
      firstName: 'امیر',
      lastName: 'آزادگان',
      gender: 'male',
      birthDate: '۱۳۵۰',
      deathDate: '',
      birthPlace: 'اصفهان',
      occupation: 'مهندس عمران',
      confidence: 'certain'
    },
    {
      id: 'p17',
      projectId: 'sample-azadegan',
      firstName: 'مینا',
      lastName: 'آزادگان',
      gender: 'female',
      birthDate: '۱۳۵۳',
      deathDate: '',
      birthPlace: 'اصفهان',
      occupation: 'حسابدار',
      confidence: 'certain'
    }
  ],
  relationships: [
    // حسن ── زهرا
    { id: 'r1', projectId: 'sample-azadegan', type: 'spouse', fromId: 'p1', toId: 'p2' },
    // حسن پدر علی، رضا، مریم
    { id: 'r2', projectId: 'sample-azadegan', type: 'father', fromId: 'p1', toId: 'p5' },
    { id: 'r3', projectId: 'sample-azadegan', type: 'father', fromId: 'p1', toId: 'p6' },
    { id: 'r4', projectId: 'sample-azadegan', type: 'father', fromId: 'p1', toId: 'p7' },
    // زهرا مادر
    { id: 'r5', projectId: 'sample-azadegan', type: 'mother', fromId: 'p2', toId: 'p5' },
    { id: 'r6', projectId: 'sample-azadegan', type: 'mother', fromId: 'p2', toId: 'p6' },
    { id: 'r7', projectId: 'sample-azadegan', type: 'mother', fromId: 'p2', toId: 'p7' },
    // علی‌اکبر ── فاطمه
    { id: 'r8', projectId: 'sample-azadegan', type: 'spouse', fromId: 'p3', toId: 'p4' },
    // علی‌اکبر و فاطمه والدین نرگس
    { id: 'r9', projectId: 'sample-azadegan', type: 'father', fromId: 'p3', toId: 'p8' },
    { id: 'r10', projectId: 'sample-azadegan', type: 'mother', fromId: 'p4', toId: 'p8' },
    // علی ── نرگس
    { id: 'r11', projectId: 'sample-azadegan', type: 'spouse', fromId: 'p5', toId: 'p8' },
    // علی پدر حسین، سارا، محمد
    { id: 'r12', projectId: 'sample-azadegan', type: 'father', fromId: 'p5', toId: 'p9' },
    { id: 'r13', projectId: 'sample-azadegan', type: 'father', fromId: 'p5', toId: 'p10' },
    { id: 'r14', projectId: 'sample-azadegan', type: 'father', fromId: 'p5', toId: 'p11' },
    // نرگس مادر
    { id: 'r15', projectId: 'sample-azadegan', type: 'mother', fromId: 'p8', toId: 'p9' },
    { id: 'r16', projectId: 'sample-azadegan', type: 'mother', fromId: 'p8', toId: 'p10' },
    { id: 'r17', projectId: 'sample-azadegan', type: 'mother', fromId: 'p8', toId: 'p11' },
    // حسین ── لیلا
    { id: 'r18', projectId: 'sample-azadegan', type: 'spouse', fromId: 'p9', toId: 'p12' },
    // حسین پدر آرمین، نیلوفر، کیان
    { id: 'r19', projectId: 'sample-azadegan', type: 'father', fromId: 'p9', toId: 'p13' },
    { id: 'r20', projectId: 'sample-azadegan', type: 'father', fromId: 'p9', toId: 'p14' },
    { id: 'r21', projectId: 'sample-azadegan', type: 'father', fromId: 'p9', toId: 'p15' },
    // لیلا مادر
    { id: 'r22', projectId: 'sample-azadegan', type: 'mother', fromId: 'p12', toId: 'p13' },
    { id: 'r23', projectId: 'sample-azadegan', type: 'mother', fromId: 'p12', toId: 'p14' },
    { id: 'r24', projectId: 'sample-azadegan', type: 'mother', fromId: 'p12', toId: 'p15' },
    // رضا پدر امیر و مینا
    { id: 'r25', projectId: 'sample-azadegan', type: 'father', fromId: 'p6', toId: 'p16' },
    { id: 'r26', projectId: 'sample-azadegan', type: 'father', fromId: 'p6', toId: 'p17' }
  ]
};
