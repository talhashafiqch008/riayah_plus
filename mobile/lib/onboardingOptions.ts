/** Option lists mirrored from mern/client careseeker onboarding steps. */

export const COUNTRIES = [
  { code: 'QAT', label: 'Qatar', flag: '🇶🇦' },
  { code: 'SAU', label: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'EGY', label: 'Egypt', flag: '🇪🇬' },
  { code: 'AUS', label: 'Australia', flag: '🇦🇺' },
  { code: 'PAK', label: 'Pakistan', flag: '🇵🇰' },
] as const;

export const PREFERRED_LANGUAGES = [
  { code: 'ENGLISH', label: 'English' },
  { code: 'ARABIC', label: 'Arabic' },
  { code: 'TAGALOG', label: 'Tagalog' },
  { code: 'HINDI', label: 'Hindi' },
  { code: 'URDU', label: 'Urdu' },
  { code: 'MALAYALAM', label: 'Malayalam' },
  { code: 'BENGALI', label: 'Bengali' },
] as const;

export const ACCOUNT_TYPES = [
  {
    id: 'myself',
    title: 'Individual Account',
    subtitle: 'For Myself',
    description: 'I am looking for care or support for my own needs.',
    details: [] as string[],
    icon: 'person-outline' as const,
  },
  {
    id: 'family_member',
    title: 'Family Guardian',
    subtitle: 'For My Family',
    description: 'I want to manage care for my parents, children, or relatives.',
    details: [
      'Request support and upload documents',
      'Stay informed about the care journey',
      'Cannot edit clinical records or care plans alone',
    ],
    icon: 'people-outline' as const,
  },
  {
    id: 'support_coordinator',
    title: 'Support Coordinator',
    subtitle: 'For Clients',
    description: 'I coordinate support for NDIS participants and clients.',
    details: [] as string[],
    icon: 'briefcase-outline' as const,
  },
] as const;

export const CARE_CATEGORIES = [
  {
    id: 'aged_care',
    label: 'Home Care',
    description: 'Elderly & Home support',
    icon: 'person-add-outline' as const,
    options: [
      { id: 'personal_care', label: 'Personal care', hint: 'Bathing, grooming' },
      { id: 'companionship', label: 'Companionship', hint: 'Social interaction' },
      { id: 'mobility_assistance', label: 'Mobility support', hint: 'Walking, transfers' },
      { id: 'meal_preparation', label: 'Meal prep', hint: 'Cooking, nutrition' },
      { id: 'medication_reminders', label: 'Medication', hint: 'Reminders only' },
      { id: 'nursing_aged', label: 'Nursing', hint: 'Clinical support' },
    ],
  },
  {
    id: 'disability_support',
    label: 'Disability',
    description: 'Special needs care',
    icon: 'accessibility-outline' as const,
    options: [
      { id: 'support_worker', label: 'Support Worker', hint: 'Daily assistance' },
      { id: 'cleaner', label: 'Cleaner', hint: 'House cleaning' },
      { id: 'gardener', label: 'Gardener', hint: 'Garden maintenance' },
      { id: 'daily_living', label: 'Daily living', hint: 'Everyday tasks' },
      { id: 'community_access', label: 'Social Access', hint: 'Outings, activities' },
      { id: 'skill_building', label: 'Skill building', hint: 'Independence' },
      { id: 'nursing_disability', label: 'Nursing', hint: 'Clinical support' },
    ],
  },
  {
    id: 'child_family',
    label: 'Babysitting',
    description: 'Kids & Families',
    icon: 'happy-outline' as const,
    options: [
      { id: 'childcare', label: 'Babysitting', hint: 'Supervision' },
      { id: 'special_needs_child', label: 'Special Needs', hint: 'Disability support' },
      { id: 'newborn_support', label: 'Newborn', hint: 'New parent help' },
      { id: 'school_pickup', label: 'School Run', hint: 'Transport' },
    ],
  },
  {
    id: 'allied_health',
    label: 'Therapy',
    description: 'Rehab services',
    icon: 'medkit-outline' as const,
    options: [
      { id: 'physiotherapy', label: 'Physio', hint: 'Exercise' },
      { id: 'occupational', label: 'Occ. Therapy', hint: 'Function' },
      { id: 'speech_therapy', label: 'Speech', hint: 'Communication' },
      { id: 'mental_wellness', label: 'Wellness', hint: 'Emotional' },
    ],
  },
  {
    id: 'home_support',
    label: 'Home Visit',
    description: 'House tasks',
    icon: 'home-outline' as const,
    options: [
      { id: 'cleaning', label: 'Cleaning', hint: 'Housekeeping' },
      { id: 'laundry', label: 'Laundry', hint: 'Washing/Ironing' },
      { id: 'meal_prep_home', label: 'Cooking', hint: 'Meal prep' },
      { id: 'shopping_errands', label: 'Errands', hint: 'Shopping' },
    ],
  },
] as const;

export const GENDER_OPTIONS = [
  { id: 'female_only', label: 'Female', description: 'Female provider only' },
  { id: 'male_only', label: 'Male', description: 'Male provider only' },
  { id: 'no_preference', label: 'No Preference', description: 'Either is fine' },
] as const;

export const PROVIDER_LANGUAGES = [
  { code: 'Arabic', label: 'Arabic', flag: '🇸🇦' },
  { code: 'English', label: 'English', flag: '🇬🇧' },
  { code: 'Tagalog', label: 'Tagalog', flag: '🇵🇭' },
  { code: 'Hindi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'Urdu', label: 'Urdu', flag: '🇵🇰' },
  { code: 'Bengali', label: 'Bengali', flag: '🇧🇩' },
  { code: 'Malayalam', label: 'Malayalam', flag: '🇮🇳' },
] as const;

export const LOCATION_OPTIONS = [
  { id: 'home', label: 'At Home', description: 'Provider comes to you', icon: 'home-outline' as const },
  { id: 'remote', label: 'Virtual', description: 'Online video calls', icon: 'videocam-outline' as const },
  { id: 'both', label: 'Flexible', description: 'Any location works', icon: 'location-outline' as const },
] as const;

export const FREQUENCY_OPTIONS = [
  { id: 'one_time', label: 'One-time', description: 'A single visit or session' },
  { id: 'weekly', label: 'Weekly', description: 'Regular weekly schedule' },
  { id: 'daily', label: 'Daily', description: 'Everyday care support' },
  { id: 'flexible', label: 'As Needed', description: 'Book when you need' },
] as const;

export const DAYS_OF_WEEK = [
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
] as const;

export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', time: '6am - 12pm', icon: 'sunny-outline' as const },
  { id: 'afternoon', label: 'Afternoon', time: '12pm - 6pm', icon: 'partly-sunny-outline' as const },
  { id: 'evening', label: 'Evening', time: '6pm - 10pm', icon: 'moon-outline' as const },
  { id: 'overnight', label: 'Overnight', time: '10pm - 6am', icon: 'cloudy-night-outline' as const },
] as const;

export const STEP_LABELS = ['Location', 'Support', 'Preferences', 'Schedule', 'Confirm'] as const;
