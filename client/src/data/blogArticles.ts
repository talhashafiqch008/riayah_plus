export interface VerifiedSource {
  id: string;
  claim: string;
  claimAr: string;
  stat?: string;
  statAr?: string;
  sourceName: string;
  sourceNameAr: string;
  sourceUrl: string;
  publisher: string;
  year: string;
}

export interface ArticleSection {
  heading: string;
  headingAr: string;
  content: string[];
  contentAr: string[];
  calloutQuote?: {
    text: string;
    textAr: string;
    attribution?: string;
    attributionAr?: string;
  };
  sourceRefIds?: string[];
}

export interface BlogArticle {
  id: string;
  slug: string;
  category: 'disability-care' | 'aged-care' | 'care-coordination' | 'policy-research' | 'family-support';
  categoryLabel: { en: string; ar: string };
  country: 'qatar' | 'saudi-arabia' | 'uae' | 'egypt' | 'kuwait' | 'bahrain' | 'oman' | 'regional';
  countryLabel: { en: string; ar: string };
  isFeatured?: boolean;
  publishedAt: string;
  readTimeMin: number;
  author: {
    name: string;
    nameAr: string;
    role: string;
    roleAr: string;
    avatar: string;
  };
  title: { en: string; ar: string };
  summary: { en: string; ar: string };
  keyTakeaways: {
    en: string[];
    ar: string[];
  };
  riayahPerspective: {
    title: { en: string; ar: string };
    content: { en: string; ar: string };
  };
  sources: VerifiedSource[];
  sections: ArticleSection[];
  relatedSlugs: string[];
}

export const VERIFIED_DIRECTORIES = [
  {
    country: 'qatar',
    countryName: { en: 'Qatar', ar: 'دولة قطر' },
    sources: [
      {
        name: { en: 'Ministry of Social Development and Family (MSDF)', ar: 'وزارة التنمية الاجتماعية والأسرة' },
        url: 'https://www.msdf.gov.qa/',
        description: { en: 'National Strategy 2025–2030 "From Care to Empowerment"', ar: 'استراتيجية الوزارة 2025–2030 "من الرعاية إلى التمكين"' },
      },
      {
        name: { en: 'MSDF Strategy Launch Official News', ar: 'إطلاق استراتيجية وزارة التنمية الاجتماعية والأسرة' },
        url: 'https://www.msdf.gov.qa/en/media-center/news-list/prime-minister-and-minister-foreign-affairs-launches-ministry-social',
        description: { en: 'Official launch of MSDF National Strategy 2025–2030 by the Prime Minister', ar: 'التغطية الرسمية لإطلاق الاستراتيجية الوطنية من قبل رئيس مجلس الوزراء' },
      },
      {
        name: { en: 'WHO EMHJ Caregiving in Qatar Study (2025)', ar: 'دراسة منظمة الصحة العالمية لجودة الرعاية في قطر (EMHJ 2025)' },
        url: 'https://www.emro.who.int/emhj-volume-31-2025/volume-31-issue-9/strategies-for-improving-the-quality-of-caregiving-in-qatar.html',
        description: { en: 'Strategies for improving the quality of caregiving in Qatar (2025)', ar: 'استراتيجيات تطوير جودة تقديم الرعاية وتأهيل الكوادر في قطر (2025)' },
      },
    ],
  },
  {
    country: 'regional',
    countryName: { en: 'WHO Eastern Mediterranean & Regional Health', ar: 'منظمة الصحة العالمية - إقليم شرق المتوسط' },
    sources: [
      {
        name: { en: 'WHO EMRO: International Day of Persons with Disabilities 2025', ar: 'منظمة الصحة العالمية: اليوم الدولي للأشخاص ذوي الإعاقة 2025' },
        url: 'https://www.emro.who.int/media/news/international-day-of-persons-with-disabilities-2025-fostering-disability-inclusive-societies.html',
        description: { en: '14.7% regional disability prevalence figure and inclusion mandates', ar: 'تقرير نسبة انتشار الإعاقة إقليمياً (14.7%) ومحددات الدمج المجتمعي' },
      },
      {
        name: { en: 'WHO Report on Disability-Inclusive Health Systems in EMR (2026)', ar: 'تقرير الصحة العالمية للمنظومات الصحية الشاملة للإعاقة (2026)' },
        url: 'https://www.emro.who.int/violence-injuries-disabilities/violence-news/new-who-report-calls-for-accelerated-efforts-to-advance-disability-inclusion-in-health-systems-in-the-eastern-mediterranean-region.html',
        description: { en: 'Advancing disability inclusion and health entitlement across Eastern Mediterranean', ar: 'الانتقال من الرعاية التقليدية إلى الاستحقاق الصحي الشامل' },
      },
    ],
  },
  {
    country: 'unicef',
    countryName: { en: 'UNICEF MENA Regional Research', ar: 'أبحاث اليونيسف لمنطقة الشرق الأوسط وشمال أفريقيا' },
    sources: [
      {
        name: { en: 'UNICEF: Children with Disabilities in MENA (Data Hub)', ar: 'اليونيسف: الأطفال ذوو الإعاقة في الشرق الأوسط وشمال أفريقيا' },
        url: 'https://data.unicef.org/resources/children-with-disabilities-in-the-middle-east-and-north-africa-a-statistical-overview-of-their-well-being/',
        description: { en: 'Statistical overview of 21 million children with disabilities in MENA', ar: 'نظرة إحصائية شاملة لواقع 21 مليون طفل من ذوي الإعاقة في المنطقة' },
      },
      {
        name: { en: 'UNICEF MENA Disability Report (Full Document)', ar: 'تقرير اليونيسف الإحصائي الموسع (PDF)' },
        url: 'https://data.unicef.org/wp-content/uploads/2022/12/MENA-Disability-report-11_30.pdf',
        description: { en: 'Complete statistical dataset on child well-being and developmental delays', ar: 'الوثيقة التحليلية الكاملة لبيانات ومؤشرات رفاه الأطفال' },
      },
      {
        name: { en: 'UNICEF: Early Detection Tools for Children in MENA', ar: 'أدوات الكشف المبكر عن التأخر النمائي والإعاقة (اليونيسف)' },
        url: 'https://www.unicef.org/mena/reports/early-detection-tools-children-developmental-delays-and-disabilities',
        description: { en: 'Culturally adapted assessment tools and multidisciplinary intervention protocols', ar: 'توطين أدوات التقييم والتدخل النمائي المبكر في البيئة العربية' },
      },
    ],
  },
];

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'qatar-from-care-to-empowerment',
    slug: 'qatar-from-care-to-empowerment',
    category: 'policy-research',
    categoryLabel: { en: 'Policy & Research', ar: 'السياسات والأبحاث' },
    country: 'qatar',
    countryLabel: { en: 'Qatar', ar: 'دولة قطر' },
    isFeatured: true,
    publishedAt: '2026-08-20',
    readTimeMin: 7,
    author: {
      name: 'Clinical Coordination Team',
      nameAr: 'فريق التنسيق الإكلينيكي',
      role: 'Riayah Plus Clinical Research Unit',
      roleAr: 'وحدة الأبحاث الإكلينيكية برعاية بلس',
      avatar: '/landing/who-family.jpg',
    },
    title: {
      en: 'From Care to Empowerment: Qatar',
      ar: 'من الرعاية إلى التمكين: قطر',
    },
    summary: {
      en: "An in-depth analysis of Qatar's Ministry of Social Development and Family Strategy 2025–2030, examining the shift from traditional welfare assistance to structured, goal-oriented empowerment for persons with disabilities and seniors.",
      ar: 'قراءة تحليلية في استراتيجية وزارة التنمية الاجتماعية والأسرة في قطر 2025–2030 "من الرعاية إلى التمكين"، واستعراض التحول المنهجي من الدعم الرعائي التقليدي إلى الاستقلالية الفردية وتأهيل الأسر.',
    },
    keyTakeaways: {
      en: [
        'Qatar is pioneering a shift from passive welfare support to active capacity-building, self-reliance, and independent living.',
        'Structured individualized care plans bridge national policy objectives with daily home routines.',
        'Care coordination is the central operational engine that prevents family exhaustion and synchronizes clinical services.',
      ],
      ar: [
        'تقود دولة قطر تحولاً استراتيجياً من الدعم الرعائي السلبي إلى بناء القدرات، والاستقلالية، والتمكين المجتمعي الشامل.',
        'تعد خطة الرعاية الفردية المبنية على الأهداف الجسر العملي الذي يربط الاستراتيجيات الوطنية بالروتين اليومي داخل المنزل.',
        'يمثل التنسيق الإكلينيكي الموحد المحرك التشغيلي الذي يحمي العائلة من الإرهاق ويوحد جهود الكوادر المتخصصة.',
      ],
    },
    riayahPerspective: {
      title: {
        en: 'The Riayah Plus Perspective',
        ar: 'منظور رعاية بلس الإكلينيكي',
      },
      content: {
        en: "National strategies establish vital legal rights and state-of-the-art infrastructure, but true empowerment unfolds in the family living room. A family should not have to become an administrative coordinator. By assigning a dedicated Care Coordinator and tracking quantifiable milestones, Riayah Plus turns national aspirations into everyday family peace of mind.",
        ar: 'الاستراتيجيات الوطنية تضع الأطر والتشريعات المتقدمة، لكن التمكين الحقيقي يُبنى في تفاصيل الحياة اليومية للأسرة. لا ينبغي أن تتحمل العائلة أعباء التنسيق الإداري المعقد. من خلال توفير منسق رعاية مخصص ومتابعة أهداف محددة، تترجم رعاية بلس رؤية الدولة إلى راحة بال واستقرار أسري مستدام.',
      },
    },
    sources: [
      {
        id: 'qatar-msdf-strategy-launch',
        claim: "Qatar launched the Ministry of Social Development and Family Strategy 2025–2030 under the theme 'From Care to Empowerment', prioritizing dignity, independent living, and community participation.",
        claimAr: 'أطلقت وزارة التنمية الاجتماعية والأسرة في قطر استراتيجيتها 2025–2030 تحت شعار "من الرعاية إلى التمكين" لتعزيز الكرامة الإنسانية والاستقلالية والدمج المجتمعي.',
        stat: 'Strategy 2025–2030',
        statAr: 'استراتيجية 2025–2030',
        sourceName: 'MSDF National Strategy Official Launch Announcement',
        sourceNameAr: 'التغطية الرسمية لإطلاق استراتيجية وزارة التنمية الاجتماعية والأسرة',
        sourceUrl: 'https://www.msdf.gov.qa/en/media-center/news-list/prime-minister-and-minister-foreign-affairs-launches-ministry-social',
        publisher: 'Ministry of Social Development and Family (Qatar)',
        year: '2025',
      },
      {
        id: 'qatar-msdf-portal',
        claim: 'Official portal of the Ministry of Social Development and Family provides frameworks for disability support, elderly services, and social enablement programs.',
        claimAr: 'البوابة الرسمية لوزارة التنمية الاجتماعية والأسرة توفر الأطر التنظيمية لخدمات ذوي الإعاقة، ورعاية كبار السن، ومبادرات التمكين الاجتماعي.',
        sourceName: 'Ministry of Social Development and Family (MSDF) Official Portal',
        sourceNameAr: 'البوابة الرسمية لوزارة التنمية الاجتماعية والأسرة',
        sourceUrl: 'https://www.msdf.gov.qa/',
        publisher: 'MSDF Qatar',
        year: '2025',
      },
    ],
    sections: [
      {
        heading: 'Redefining the Care Model in Qatar',
        headingAr: 'إعادة صياغة نموذج الرعاية في دولة قطر',
        content: [
          'Under the leadership of the Ministry of Social Development and Family, Qatar has outlined a progressive roadmap for 2025–2030 titled "From Care to Empowerment". This represents a departure from traditional institutional dependency toward personal autonomy.',
          'The core thesis is clear: individuals receiving care (whether children with disabilities or aging elders) thrive when support is structured around their personal aspirations, cultural dignity, and home environment.',
        ],
        contentAr: [
          'أرست وزارة التنمية الاجتماعية والأسرة في قطر خارطة طريق متقدمة للأعوام 2025–2030 تحت شعار "من الرعاية إلى التمكين"، معلنة تحولاً حاسماً من الرعاية الإيوائية والاعتمادية إلى الاستقلالية الفردية والتمكين الذاتي.',
          'تقوم الفلسفة الأساسية على أن المستفيدين، سواء كانوا أطفالاً من ذوي الإعاقة أو كباراً في السن، يحققون أعلى درجات التطور عندما تُصمم الرعاية حول أهدافهم الشخصية وفي محيطهم الأسري المألوف.',
        ],
        sourceRefIds: ['qatar-msdf-strategy-launch'],
      },
      {
        heading: 'From Strategy to Daily Implementation',
        headingAr: 'من الاستراتيجية إلى التطبيق اليومي داخل المنزل',
        content: [
          'While the policy framework sets the vision, families require structured operational support to navigate multi-disciplinary healthcare providers, therapies, and equipment.',
          'A centralized Care Plan bridges the clinical world with family life, turning high-level empowerment goals into transparent, weekly milestone tracking.',
        ],
        contentAr: [
          'بينما تضع الاستراتيجية الوطنية الرؤية الكبرى، تحتاج الأسر إلى دعم تنفيذي منظم للتعامل مع الممارسين الصحيين، والمعالجين، والتقنيات المساندة دون تشتت.',
          'خطة الرعاية الفردية هي الجسر الذي يربط التوصيات الطبية بواقع المنزل، وتحول أهداف التمكين الكبرى إلى خطوات أسبوعية واضحة ومقاسة بدقة.',
        ],
        sourceRefIds: ['qatar-msdf-portal'],
      },
    ],
    relatedSlugs: ['qatar-specialized-care-workforce', 'who-disability-new-regional-model'],
  },
  {
    id: 'qatar-specialized-care-workforce',
    slug: 'qatar-specialized-care-workforce',
    category: 'care-coordination',
    categoryLabel: { en: 'Care Coordination', ar: 'تنسيق الرعاية' },
    country: 'qatar',
    countryLabel: { en: 'Qatar', ar: 'دولة قطر' },
    publishedAt: '2026-08-14',
    readTimeMin: 8,
    author: {
      name: 'Dr. Tariq Al-Mansoor',
      nameAr: 'د. طارق المنصور',
      role: 'Healthcare Workforce & Clinical Systems Specialist',
      roleAr: 'استشاري الأنظمة الإكلينيكية وتطوير الكوادر',
      avatar: '/landing/australia-care-origins.jpg',
    },
    title: {
      en: 'Why Does Qatar Need Specialized Caregiving Workforces?',
      ar: 'لماذا تحتاج قطر إلى كوادر رعاية متخصصة؟',
    },
    summary: {
      en: 'Drawing on the WHO EMHJ (2025) study on caregiving quality in Qatar, we analyze the urgent need for accredited geriatric and disability home-care professionals to support family caregivers and enhance clinical outcomes.',
      ar: 'استناداً إلى دراسة مجلة الصحة لشرق المتوسط (WHO EMHJ 2025) حول جودة تقديم الرعاية في قطر، نستعرض الضرورة الملحة لتدريب واعتماد كوادر رعاية منزلية متخصصة لمساندة الأسر ورفع جودة الخدمات الإكلينيكية.',
    },
    keyTakeaways: {
      en: [
        'WHO EMHJ research highlights that untrained informal caregiving increases the risk of caregiver strain and avoidable hospital admissions.',
        'Qatar is witnessing rapid growth in demand for specialized home nursing, allied rehabilitation, and neuro-developmental therapy.',
        'Continuous clinical oversight and professional career pathways for care workers are foundational to long-term care quality.',
      ],
      ar: [
        'تؤكد أبحاث منظمة الصحة العالمية (EMHJ) أن تقديم الرعاية غير المتخصصة يضاعف معدلات إجهاد الأسرة ويزيد من دخول المستشفيات غير الضروري.',
        'تشهد دولة قطر طلباً متنامياً على التمريض المنزلي المتخصص، والعلاج التأهيلي المساند، ورعاية الاضطرابات النمائية والعصبية.',
        'يُعد الإشراف الإكلينيكي المستمر وتوفير مسارات مهنية مجزية لكوادر الرعاية الركيزة الأساسية لضمان جودة الرعاية المنزلية.',
      ],
    },
    riayahPerspective: {
      title: {
        en: 'The Riayah Plus Perspective',
        ar: 'منظور رعاية بلس الإكلينيكي',
      },
      content: {
        en: 'Good care is not simply sending a support worker into a home; it is about building a vetted, rigorously trained clinical team aligned under a unified care plan. Riayah Plus invests in continuous professional training, clinical supervision, and structured coordinator management so families can welcome care teams with complete trust.',
        ar: 'الرعاية الحقيقية لا تقتصر على إرسال ممارس أو ممرض إلى المنزل، بل تكمن في بناء فريق إكلينيكي مدرب ومعتمد يعمل بتناغم تحت إشراف خطة رعاية موحدة. تستثمر رعاية بلس في التدريب المستمر والإشراف المهني حتى تستقبل العائلة فريق الرعاية بثقة واطمئنان تامين.',
      },
    },
    sources: [
      {
        id: 'who-emhj-qatar-caregivers-2025',
        claim: 'Research published in the WHO Eastern Mediterranean Health Journal (EMHJ 2025) details key strategies for improving caregiving quality, clinical competence, and caregiver support frameworks in Qatar.',
        claimAr: 'فصلت دراسة منشورة في المجلة الصحية لشرق المتوسط (منظمة الصحة العالمية 2025) استراتيجيات تحسين جودة تقديم الرعاية، والكفاءة الإكلينيكية، ومنظومات دعم مقدمي الرعاية في قطر.',
        stat: 'WHO EMHJ 2025 Study',
        statAr: 'دراسة EMHJ 2025',
        sourceName: 'Strategies for Improving the Quality of Caregiving in Qatar',
        sourceNameAr: 'استراتيجيات تحسين جودة تقديم الرعاية في قطر',
        sourceUrl: 'https://www.emro.who.int/emhj-volume-31-2025/volume-31-issue-9/strategies-for-improving-the-quality-of-caregiving-in-qatar.html',
        publisher: 'World Health Organization (EMRO)',
        year: '2025',
      },
    ],
    sections: [
      {
        heading: 'The Evolving Care Landscape in Qatar',
        headingAr: 'التحولات الديموغرافية والاحتياج المتزايد في قطر',
        content: [
          'With medical advancements extending life expectancy and diagnostic tools identifying developmental conditions earlier, the complexity of in-home care requirements has risen sharply in Qatar.',
          'Families managing chronic conditions such as post-stroke mobility impairment, Alzheimer disease, or severe autism require specialized clinical skills (such as dysphagia management, transfer techniques, and behavioral redirection) that general domestic support cannot provide.',
        ],
        contentAr: [
          'مع التطور الطبي وارتفاع متوسط الأعمار والتشخيص المبكر للحالات النمائية، ارتفعت درجة تعقيد الرعاية المنزلية المطلوبة في المجتمع القطري بصورة ملحوظة.',
          'تحتاج الأسر التي ترعى حالات مثل ما بعد الجلطات الدماغية، أو ألزهايمر، أو التوحد إلى مهارات إكلينيكية دقيقة كإدارة صعوبات البلع، والنقل الحركي الآمن، والتعديل السلوكي، وهي مهارات لا يمكن للعمالة المنزلية غير المتخصصة تقديمها.',
        ],
        sourceRefIds: ['who-emhj-qatar-caregivers-2025'],
      },
      {
        heading: 'Professionalization: Protecting Families and Caregivers',
        headingAr: 'الاحترافية والتأهيل: حماية العائلة والممارس الصحي',
        content: [
          'The WHO EMHJ study emphasizes that establishing structured competency frameworks and ongoing clinical supervision directly reduces medical errors and prevents physical and psychological burnout among family members.',
          'Professionalizing caregiving transforms home support from an ad-hoc arrangement into a reliable, dignified clinical service.',
        ],
        contentAr: [
          'تؤكد دراسة منظمة الصحة العالمية أن وضع معايير كفاءة مهنية وإشراف إكلينيكي مستمر يسهم مباشرة في خفض الأخطاء الطبية وتجنيب أفراد الأسرة الاحتراق النفسي والجسدي.',
          'إن إضفاء الطابع المهني المعتمد على الرعاية المنزلية يحولها من ترتيبات فردية عشوائية إلى خدمة إكلينيكية رصينة وموثوقة.',
        ],
      },
    ],
    relatedSlugs: ['qatar-from-care-to-empowerment', 'who-disability-new-regional-model'],
  },
  {
    id: 'who-disability-new-regional-model',
    slug: 'who-disability-new-regional-model',
    category: 'disability-care',
    categoryLabel: { en: 'Disability Care', ar: 'رعاية ذوي الإعاقة' },
    country: 'regional',
    countryLabel: { en: 'Regional & International', ar: 'إقليمي ودولي' },
    publishedAt: '2026-08-08',
    readTimeMin: 9,
    author: {
      name: 'Riayah Care Advisory Council',
      nameAr: 'مجلس رعاية بلس الاستشاري',
      role: 'Multi-Disciplinary Clinical Panel',
      roleAr: 'هيئة استشارية إكلينيكية متعددة التخصصات',
      avatar: '/landing/who-family.jpg',
    },
    title: {
      en: 'Care for Persons with Disabilities: A New Regional Model',
      ar: 'رعاية الأشخاص ذوي الإعاقة: نموذج إقليمي جديد',
    },
    summary: {
      en: 'Exploring the WHO EMRO 2025 benchmark indicating a 14.7% disability prevalence across the region, and why the Middle East requires a coordinated care model designed around family involvement and community integration.',
      ar: 'قراءة في مؤشرات منظمة الصحة العالمية لعام 2025 التي تشير إلى أن نسبة انتشار الإعاقة في المنطقة تصل إلى 14.7%، ولماذا يحتاج العالم العربي إلى نموذج رعاية متكامل مبني على التماسك الأسري والدمج المجتمعي.',
    },
    keyTakeaways: {
      en: [
        'WHO data confirms disability affects approximately 14.7% of the regional population, demanding scalable community and in-home care delivery systems.',
        'Traditional institutionalization is being replaced by personalized home-based rehabilitation and assistive technology integration.',
        'Models must integrate multi-generational family structures rather than relying solely on individualist Western paradigms.',
      ],
      ar: [
        'تؤكد بيانات الصحة العالمية أن الإعاقة تمس قرابة 14.7% من سكان الإقليم، مما يستدعي حلولاً رعاية منزلية ومجتمعية قابلة للتوسع.',
        'تتراجع نماذج الرعاية الإيوائية المعزولة لصالح التأهيل المنزلي الفردي واستخدام التقنيات المساندة الحديثة.',
        'يجب أن تستوعب النماذج الحديثة طبيعة الأسرة العربية الممتدة بدلاً من الاكتفاء بالاستنساخ الحرفي للنماذج الفردية الغربية.',
      ],
    },
    riayahPerspective: {
      title: {
        en: 'The Riayah Plus Perspective',
        ar: 'منظور رعاية بلس الإكلينيكي',
      },
      content: {
        en: 'A 14.7% prevalence rate is not a distant statistic; it touches nearly every extended family in our region. Our model is built specifically for this regional reality: pairing international clinical standards from Australia with the warmth, dignity, and collective solidarity that define our communities.',
        ar: 'معدل انتشار 14.7% ليس مجرد رقم إحصائي مجرد، بل هو واقع يمس كل أسرة ممتدة في مجتمعاتنا تقريباً. تم تصميم نموذج رعاية بلس ليواكب هذا الواقع تحديداً: دمج المعايير الإكلينيكية الأسترالية العالمية مع الدفء والكرامة والتضامن الأسري الأصيل.',
      },
    },
    sources: [
      {
        id: 'who-emro-idpd-2025',
        claim: 'WHO EMRO highlighted during International Day of Persons with Disabilities 2025 that an estimated 14.7% of the Eastern Mediterranean population lives with some form of disability, calling for inclusive societal systems.',
        claimAr: 'أكدت منظمة الصحة العالمية لإقليم شرق المتوسط بمناسبة اليوم الدولي للأشخاص ذوي الإعاقة 2025 أن نحو 14.7% من السكان يعيشون مع شكل من أشكال الإعاقة، داعية إلى بناء مجتمعات دامجة وشاملة.',
        stat: '14.7% Prevalence',
        statAr: '14.7% معدل الانتشار',
        sourceName: 'WHO EMRO International Day of Persons with Disabilities 2025',
        sourceNameAr: 'بيان منظمة الصحة العالمية - اليوم الدولي للأشخاص ذوي الإعاقة 2025',
        sourceUrl: 'https://www.emro.who.int/media/news/international-day-of-persons-with-disabilities-2025-fostering-disability-inclusive-societies.html',
        publisher: 'World Health Organization (EMRO)',
        year: '2025',
      },
    ],
    sections: [
      {
        heading: 'The Scope: Understanding the 14.7% Regional Figure',
        headingAr: 'حجم الواقع: قراءة في مؤشر الـ 14.7% الإقليمي',
        content: [
          'According to WHO EMRO, disability prevalence in the Eastern Mediterranean region stands at approximately 14.7%, encompassing physical, intellectual, sensory, and psychosocial impairments.',
          'Despite this significant figure, healthcare access has historically remained fragmented, forcing families to seek consultations across disparate clinics without cohesive longitudinal planning.',
        ],
        contentAr: [
          'وفقاً لتقارير منظمة الصحة العالمية لشرق المتوسط، يقدر انتشار الإعاقة في المنطقة بنحو 14.7%، وتشمل الإعاقات الحركية، والذهنية، والحسية، والنمائية.',
          'وعلى الرغم من هذه النسبة الكبيرة، بقيت الخدمات العلاجية مبعثرة تاريخياً، مما ألزم الأسر بالتنقل المضني بين عيادات ومراكز متباعدة تفتقر إلى التنسيق التكاملي المستمر.',
        ],
        sourceRefIds: ['who-emro-idpd-2025'],
      },
      {
        heading: 'Building the Coordinated Regional Model',
        headingAr: 'بناء النموذج الإقليمي المنسق',
        content: [
          'The new regional model replaces fragmented visits with an individualized multidisciplinary Care Plan. Therapists in physiotherapy, occupational therapy, and speech pathology synchronize their goals under the direction of a dedicated Care Coordinator.',
          'This structured approach ensures therapy translates into functional real-world independence within the home.',
        ],
        contentAr: [
          'يقوم النموذج الإقليمي الجديد على استبدال المواعيد المنفصلة بخطة رعاية فردية متكاملة، ينسق فيها أخصائيو العلاج الطبيعي والوظيفي والنطق أهدافهم تحت إشراف منسق رعاية مخصص.',
          'هذا النهج المنهجي يضمن تحويل التمارين العلاجية إلى استقلالية وظيفية حقيقية يلمسها المريض في حياته اليومية.',
        ],
      },
    ],
    relatedSlugs: ['who-from-care-to-health-entitlement', 'unicef-21-million-children-disabilities'],
  },
  {
    id: 'who-from-care-to-health-entitlement',
    slug: 'who-from-care-to-health-entitlement',
    category: 'policy-research',
    categoryLabel: { en: 'Policy & Research', ar: 'السياسات والأبحاث' },
    country: 'regional',
    countryLabel: { en: 'Regional & International', ar: 'إقليمي ودولي' },
    publishedAt: '2026-08-01',
    readTimeMin: 7,
    author: {
      name: 'Sarah Al-Hamadi, RN',
      nameAr: 'سارة الحمادي',
      role: 'Clinical Governance & Health Systems Lead',
      roleAr: 'أخصائية الحوكمة الإكلينيكية والمنظومات الصحية',
      avatar: '/landing/care-plan-milestone.jpg',
    },
    title: {
      en: 'From "Care" to "Health Entitlement": WHO 2026 Framework',
      ar: 'من "الرعاية" إلى "الاستحقاق الصحي"',
    },
    summary: {
      en: 'Analyzing the 2026 WHO report calling for accelerated disability inclusion across Eastern Mediterranean health systems, and what the transition to guaranteed health entitlement means for patients and families.',
      ar: 'تحليل لتقرير منظمة الصحة العالمية الجديد لعام 2026 الداعي إلى تسريع دمج ذوي الإعاقة في المنظومات الصحية لشرق المتوسط، وما يعنيه الانتقال إلى "الاستحقاق الصحي" للأسر.',
    },
    keyTakeaways: {
      en: [
        'The WHO 2026 report emphasizes that disability-inclusive healthcare is an enforceable human right and health entitlement, not discretionary charity.',
        'Healthcare systems must eliminate architectural, informational, and operational barriers to primary and specialized care.',
        'Decentralizing care into the home environment is central to achieving universal, equitable health coverage.',
      ],
      ar: [
        'يؤكد تقرير الصحة العالمية 2026 أن الرعاية الصحية الدامجة لذوي الإعاقة استحقاق صحي وحق إنساني أصيل وليست مجرد عمل خيري تقديري.',
        'يتعين على المنظومات الصحية إزالة العوائق المعمارية والمعلوماتية والإجرائية أمام الرعاية الأولية والتخصصية.',
        'تعد لامركزية الرعاية ونقل الخدمات إلى البيئة المنزلية الركيزة الأساسية لتحقيق التغطية الصحية الشاملة والعادلة.',
      ],
    },
    riayahPerspective: {
      title: {
        en: 'The Riayah Plus Perspective',
        ar: 'منظور رعاية بلس الإكلينيكي',
      },
      content: {
        en: 'Viewing care as an "entitlement" transforms how services are designed and delivered. Patients and families are not passive recipients; they are empowered partners with rights to transparent care plans, clinical accountability, and seamless coordination. Riayah Plus was architected around this rights-based entitlement philosophy.',
        ar: 'إن النظر إلى الرعاية كـ "استحقاق صحي" يغير جذرياً طريقة تصميم الخدمات وتقديمها. المستفيد وأسرته ليسوا متلقين سلبيين، بل هم شركاء كاملو الحقوق يمتلكون خطط رعاية شفافة، ومساءلة إكلينيكية، وتنسيقاً سلساً. بنيت رعاية بلس لتجسيد هذه الفلسفة الحقوقية عملياً.',
      },
    },
    sources: [
      {
        id: 'who-disability-inclusion-report-2026',
        claim: 'WHO published a groundbreaking 2026 report calling for accelerated national efforts to advance disability inclusion and establish comprehensive health entitlements across Eastern Mediterranean health systems.',
        claimAr: 'أصدرت منظمة الصحة العالمية تقريراً رائداً لعام 2026 يدعو لتسريع الجهود الوطنية لإدماج ذوي الإعاقة وإرساء الاستحقاق الصحي الشامل في المنظومات الصحية لإقليم شرق المتوسط.',
        stat: 'WHO 2026 Report',
        statAr: 'تقرير الصحة العالمية 2026',
        sourceName: 'New WHO Report on Disability-Inclusive Health Systems in EMR (2026)',
        sourceNameAr: 'تقرير منظمة الصحة العالمية للمنظومات الصحية الشاملة للإعاقة (2026)',
        sourceUrl: 'https://www.emro.who.int/violence-injuries-disabilities/violence-news/new-who-report-calls-for-accelerated-efforts-to-advance-disability-inclusion-in-health-systems-in-the-eastern-mediterranean-region.html',
        publisher: 'World Health Organization (EMRO)',
        year: '2026',
      },
    ],
    sections: [
      {
        heading: 'A Paradigm Shift from Charity to Entitlement',
        headingAr: 'التحول المفاهيمي: من الرعاية الخيرية إلى الاستحقاق الأصيل',
        content: [
          'For decades, disability care was viewed through the lens of charitable welfare. The WHO 2026 report cements an essential shift: access to comprehensive rehabilitation, assistive devices, and coordinated medical care is a non-negotiable health entitlement.',
          'This entitlement requires health systems to structure transparent care pathways where patients have continuous access to accredited clinicians without prohibitive bureaucratic delays.',
        ],
        contentAr: [
          'لعقود طويلة، نُظر إلى رعاية ذوي الإعاقة من منظور الرعاية الخيرية. لكن تقرير الصحة العالمية 2026 يرسخ تحولاً حاسماً: الوصول إلى التأهيل الشامل، والتقنيات المساندة، والرعاية المنسقة هو استحقاق صحي أصيل لا يقبل المساومة.',
          'يتطلب هذا الاستحقاق من المنظومات الصحية بناء مسارات واضحة تمكّن المرضى من تلقي الرعاية المستمرة دون تعقيدات بيروقراطية معطلة.',
        ],
        sourceRefIds: ['who-disability-inclusion-report-2026'],
      },
      {
        heading: 'Operationalizing Health Entitlement at Home',
        headingAr: 'تطبيق الاستحقاق الصحي في الواقع المنزلي',
        content: [
          'Achieving universal health entitlement means bringing clinical care directly to where patients live. In-home nursing, specialized physiotherapy, and telehealth reviews eliminate physical accessibility bottlenecks.',
          'With a unified digital care record, every clinician involved in a patient’s journey operates with complete visibility, ensuring continuous quality and accountability.',
        ],
        contentAr: [
          'إن تجسيد الاستحقاق الصحي يتطلب إيصال الرعاية المتخصصة إلى بيئة المريض المنزلية، حيث تسهم الزيارات المنزلية والتمريض والتطبيب عن بُعد في إزالة عوائق التنقل والوصول.',
          'وعبر سجل الرعاية الرقمي الموحد، يعمل كافة الأطباء والمعالجين برؤية إكلينيكية متكاملة تضمن أعلى درجات الجودة والمساءلة.',
        ],
      },
    ],
    relatedSlugs: ['who-disability-new-regional-model', 'unicef-21-million-children-disabilities'],
  },
  {
    id: 'unicef-21-million-children-disabilities',
    slug: 'unicef-21-million-children-disabilities',
    category: 'family-support',
    categoryLabel: { en: 'Family Support', ar: 'دعم العائلة والطفولة' },
    country: 'regional',
    countryLabel: { en: 'UNICEF & MENA', ar: 'اليونيسف والمنطقة' },
    publishedAt: '2026-07-22',
    readTimeMin: 8,
    author: {
      name: 'Nouran El-Shamy',
      nameAr: 'نوران الشامي',
      role: 'Child Development & Early Intervention Lead',
      roleAr: 'أخصائية التدخل المبكر وتنمية مهارات الطفل',
      avatar: '/landing/australia-care-origins.jpg',
    },
    title: {
      en: '21 Million Children with Disabilities in the Region: The UNICEF Data',
      ar: '٢١ مليون طفل من ذوي الإعاقة في المنطقة',
    },
    summary: {
      en: 'Examining the landmark UNICEF statistical overview of 21 million children with disabilities across MENA, exploring the crucial developmental intersection of early detection, family support, and multi-disciplinary therapies.',
      ar: 'قراءة في تقرير اليونيسف الإحصائي الشامل حول واقع 21 مليون طفل من ذوي الإعاقة في الشرق الأوسط وشمال أفريقيا، واستكشاف أهمية التكامل بين الكشف المبكر، ودعم الأسرة، والجلسات التأهيلية المتناغمة.',
    },
    keyTakeaways: {
      en: [
        'UNICEF estimates that over 21 million children in the MENA region live with developmental, sensory, or physical disabilities.',
        'Children receiving early multi-disciplinary support achieve significantly higher rates of school inclusion and functional independence.',
        'Families carry immense psychological and coordination burdens that require structured caregiver support systems.',
      ],
      ar: [
        'تقدر اليونيسف أن أكثر من 21 مليون طفل في منطقة الشرق الأوسط وشمال أفريقيا يعيشون مع إعاقات نمائية أو حسية أو حركية.',
        'الأطفال الذين يتلقون دعماً تأهيلياً مبكراً ومتعدد التخصصات يحققون معدلات أعلى بكثير في الدمج المدرسي والاستقلالية.',
        'تتحمل الأسر أعباء نفسية وتنظيمية هائلة تتطلب توفير منظومات دعم متكاملة لتمكين الوالدين ومساندتهم.',
      ],
    },
    riayahPerspective: {
      title: {
        en: 'The Riayah Plus Perspective',
        ar: 'منظور رعاية بلس الإكلينيكي',
      },
      content: {
        en: 'Behind the figure of 21 million children are families seeking hope, guidance, and structured answers. A child’s development cannot be divided into isolated 45-minute clinic visits. When speech, occupational, and behavioral therapists coordinate closely with parents through a single Care Plan, every day becomes a developmental milestone.',
        ar: 'وراء رقم الـ 21 مليون طفل عائلات تبحث عن الأمل والإرشاد والحلول المنظمة. لا يمكن تجزئة نمو الطفل إلى جلسات عيادية متفرقة مدتها 45 دقيقة. حينما يتعاون أخصائيو النطق والعلاج الوظيفي وتعديل السلوك مع الوالدين عبر خطة رعاية موحدة، يتحول كل يوم في المنزل إلى خطوة نمائية ملهمة.',
      },
    },
    sources: [
      {
        id: 'unicef-mena-report-landing',
        claim: 'UNICEF published a comprehensive statistical overview on children with disabilities in MENA, estimating that over 21 million children face developmental, physical, or sensory disabilities.',
        claimAr: 'أصدرت منظمة اليونيسف تقريراً إحصائياً شاملاً حول الأطفال ذوي الإعاقة في الشرق الأوسط وشمال أفريقيا، مقدرة عددهم بأكثر من 21 مليون طفل يواجهون صعوبات نمائية أو حسية أو حركية.',
        stat: '21 Million Children',
        statAr: '٢١ مليون طفل',
        sourceName: 'UNICEF Data: Children with Disabilities in MENA Statistical Overview',
        sourceNameAr: 'تقرير اليونيسف الإحصائي: الأطفال ذوو الإعاقة في الشرق الأوسط',
        sourceUrl: 'https://data.unicef.org/resources/children-with-disabilities-in-the-middle-east-and-north-africa-a-statistical-overview-of-their-well-being/',
        publisher: 'UNICEF Data & Analytics',
        year: '2025',
      },
      {
        id: 'unicef-mena-report-pdf',
        claim: 'The full UNICEF report details prevalence, health disparities, education access, and the critical role of coordinated early childhood intervention.',
        claimAr: 'تفصل الوثيقة الإحصائية لليونيسف معدلات الانتشار، والفوارق الصحية، وفرص التعليم، والدور الحاسم للتدخل المبكر المنسق.',
        sourceName: 'UNICEF MENA Disability Full Report (PDF)',
        sourceNameAr: 'تقرير اليونيسف الموسع للأطفال ذوي الإعاقة في الشرق الأوسط (PDF)',
        sourceUrl: 'https://data.unicef.org/wp-content/uploads/2022/12/MENA-Disability-report-11_30.pdf',
        publisher: 'UNICEF MENA Regional Office',
        year: '2025',
      },
    ],
    sections: [
      {
        heading: 'The Regional Reality for 21 Million Children',
        headingAr: 'الواقع الإقليمي لـ 21 مليون طفل في المنطقة',
        content: [
          'The UNICEF report provides the most comprehensive data synthesis on childhood disability in MENA to date. It reveals that millions of children face compounded barriers, ranging from delayed developmental screening to fragmented therapy access.',
          'Early childhood is a period of intense neuroplasticity. Missing the window between ages zero and six often leads to preventable lifelong dependency.',
        ],
        contentAr: [
          'يقدم تقرير اليونيسف أوسع مسح إحصائي حول إعاقات الطفولة في المنطقة حتى الآن، كاشفاً أن ملايين الأطفال يواجهون تحديات مركبة تبدأ من تأخر التشخيص وصولاً إلى تشتت الخدمات التأهيلية.',
          'تعد مرحلة الطفولة المبكرة نافذة ذهبية للمرونة العصبية، وتفويت التدخل في الأعوام الأولى (من الولادة حتى 6 سنوات) يؤدي إلى مضاعفة صعوبات الاعتمادية لاحقاً.',
        ],
        sourceRefIds: ['unicef-mena-report-landing', 'unicef-mena-report-pdf'],
      },
      {
        heading: 'Synchronizing Multi-Disciplinary Pediatric Care',
        headingAr: 'تكامل الرعاية التأهيلية للأطفال',
        content: [
          'A child with developmental delays often requires occupational therapy for sensory integration, speech therapy for communication, and behavioral therapy for social interaction.',
          'When these therapies operate independently, children experience conflicting approaches and cognitive fatigue. Riayah Plus integrates all pediatric specialties into a single synchronized Care Plan.',
        ],
        contentAr: [
          'يحتاج الطفل ذو التأخر النمائي غالباً إلى علاج وظيفي للتكامل الحسي، وعلاج نطق للتواصل، وتعديل سلوك للتفاعل الاجتماعي.',
          'وعندما تعمل هذه التخصصات بمعزل عن بعضها، يواجه الطفل تشتتاً وإرهاقاً ذهنياً. توحد رعاية بلس كافة التخصصات التأهيلية ضمن خطة رعاية واحدة متناغمة تقودها أهداف واضحة.',
        ],
      },
    ],
    relatedSlugs: ['unicef-early-detection-tools-adaptation', 'who-disability-new-regional-model'],
  },
  {
    id: 'unicef-early-detection-tools-adaptation',
    slug: 'unicef-early-detection-tools-adaptation',
    category: 'family-support',
    categoryLabel: { en: 'Family Support', ar: 'دعم العائلة والطفولة' },
    country: 'regional',
    countryLabel: { en: 'UNICEF & MENA', ar: 'اليونيسف والمنطقة' },
    publishedAt: '2026-07-10',
    readTimeMin: 7,
    author: {
      name: 'Executive Care Leadership',
      nameAr: 'الإدارة الإكلينيكية العليا',
      role: 'Riayah Plus Systems Design Group',
      roleAr: 'مجموعة تصميم الأنظمة الإكلينيكية برعاية بلس',
      avatar: '/landing/australia-care-origins.jpg',
    },
    title: {
      en: 'Why Global Early Detection Tools Cannot Be Blindly Copied: UNICEF MENA Insights',
      ar: 'لماذا لا يمكن نسخ أدوات الكشف المبكر العالمية كما هي؟',
    },
    summary: {
      en: 'Analyzing the UNICEF report on early detection tools for developmental delays in MENA, exploring why assessment tools and intervention protocols must be culturally adapted to Arabic family environments and linguistic contexts.',
      ar: 'قراءة في تقرير اليونيسف حول أدوات الكشف المبكر عن التأخر النمائي في الشرق الأوسط، واستعراض أسباب ضرورة توطين أدوات التقييم والبروتوكولات التأهيلية لتلائم البيئة الأسرية واللغوية العربية.',
    },
    keyTakeaways: {
      en: [
        'Direct translation of Western developmental assessment scales leads to cultural bias and inaccurate milestone benchmarking.',
        'Early detection tools must reflect Arabic linguistic development, local family dynamics, and regional living patterns.',
        'Clinical protocols must treat the family as active co-therapists rather than passive test subjects.',
      ],
      ar: [
        'الترجمة الحرفية لمقاييس التقييم النمائي الغربية تؤدي إلى انحيازات ثقافية وعدم دقة في قياس التطور الطبيعي للطفل العربي.',
        'يجب أن تعكس أدوات الكشف المبكر خصائص التطور اللغوي العربي، وأنماط الحياة الأسرية، والتفاعل الاجتماعي في المنطقة.',
        'يجب أن تتعامل البروتوكولات الإكلينيكية مع الأسرة كشريك علاجي فاعل وليس كمجرد متلقٍ للاختبارات.',
      ],
    },
    riayahPerspective: {
      title: {
        en: 'The Riayah Plus Perspective',
        ar: 'منظور رعاية بلس الإكلينيكي',
      },
      content: {
        en: 'True clinical excellence requires contextual intelligence. Our care models adapt proven international assessment standards to Arabic language nuances, family traditions, and home routines. Global expertise only delivers real value when it is deeply rooted in local vision.',
        ar: 'التميز الإكلينيكي الحقيقي يتطلب وعياً بالسياق والبيئة. تعمل نماذج رعاية بلس على تكييف المعايير الدولية المعتمدة مع خصوصية اللغة العربية، والتقاليد الأسرية، والروتين المنزلي اليومي. فالخبرة العالمية لا تؤتي ثمارها إلا إذا اقترنت برؤية محلية عميقة.',
      },
    },
    sources: [
      {
        id: 'unicef-early-detection-report',
        claim: 'UNICEF MENA published an authoritative report on early detection tools for children with developmental delays and disabilities, highlighting the necessity of culturally validating diagnostic and screening instruments.',
        claimAr: 'أصدر مكتب اليونيسف الإقليمي تقريراً مرجعياً حول أدوات الكشف المبكر للأطفال ذوي التأخر النمائي والإعاقة، مؤكداً حتمية التوطين والتكييف الثقافي لأدوات الفحص والتشخيص.',
        sourceName: 'UNICEF: Early Detection Tools for Children with Developmental Delays in MENA',
        sourceNameAr: 'تقرير اليونيسف: أدوات الكشف المبكر للأطفال ذوي التأخر النمائي في الشرق الأوسط',
        sourceUrl: 'https://www.unicef.org/mena/reports/early-detection-tools-children-developmental-delays-and-disabilities',
        publisher: 'UNICEF MENA',
        year: '2025',
      },
    ],
    sections: [
      {
        heading: 'The Pitfall of Literal Translation in Developmental Assessment',
        headingAr: 'فخ الترجمة الحرفية في مقاييس التقييم النمائي',
        content: [
          'Many developmental screening tests (such as speech milestones, motor evaluations, and social engagement scales) were standardized on specific Western demographic cohorts.',
          'When directly translated without cultural adaptation, they often misinterpret typical Arabic communicative gestures, multi-generational household dynamics, and cultural milestones as developmental deficits.',
        ],
        contentAr: [
          'تم تقنين العديد من اختبارات المسح النمائي (كمعايير النطق، والتقييم الحركي، والتفاعل الاجتماعي) على عينات غربية محددة.',
          'وعند ترجمتها حرفياً دون تكييف لغوي وثقافي، قد يُساء تفسير بعض أنماط التواصل والتفاعل المعتادة في الأسرة العربية الممتدة على أنها علامات تأخر.',
        ],
        sourceRefIds: ['unicef-early-detection-report'],
      },
      {
        heading: 'Adapting Clinical Protocols for Regional Families',
        headingAr: 'توطين البروتوكولات الإكلينيكية للأسر العربية',
        content: [
          'Effective early intervention requires equipping parents with practical home-based techniques that fit seamlessly into family routines like shared meals and family gatherings.',
          'Riayah Plus incorporates culturally validated developmental frameworks, giving parents and therapists a shared vocabulary to track genuine progress.',
        ],
        contentAr: [
          'يتطلب التدخل المبكر الناجح تزويد الوالدين بتمارين وأساليب منزلية عملية تندمج بسلاسة في الروتين الأسري اليومي واللقاءات العائلية.',
          'تعتمد رعاية بلس أطراً تقييمية نمائية موافقة للواقع المحلي، مما يمنح الأسرة والأخصائيين لغة مشتركة وواضحة لقياس التقدم الحقيقي.',
        ],
      },
    ],
    relatedSlugs: ['unicef-21-million-children-disabilities', 'qatar-specialized-care-workforce'],
  },
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}

export function getFeaturedArticle(): BlogArticle {
  return BLOG_ARTICLES.find((a) => a.isFeatured) || BLOG_ARTICLES[0];
}

export function getRelatedArticles(slug: string): BlogArticle[] {
  const current = getArticleBySlug(slug);
  if (!current) return BLOG_ARTICLES.slice(0, 3);
  return BLOG_ARTICLES.filter((a) => a.slug !== slug && current.relatedSlugs.includes(a.slug)).slice(0, 3);
}
