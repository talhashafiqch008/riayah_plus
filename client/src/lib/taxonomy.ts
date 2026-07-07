import {
    Shield, Heart, User, Activity, Baby, Stethoscope, Truck, Home, Briefcase, Smile, Brain, Eye, Ear, Bone,
    Bath, Users, Sparkles, Utensils, Syringe, Bed,
    Droplet, Thermometer, Wind, AlertTriangle, Pill, AlertOctagon,
    Accessibility, DoorOpen, Footprints, Dog, Hand,
    Music, Palette, MessageCircle, HeartHandshake, Puzzle, Dumbbell, HelpingHand
} from "lucide-react";

// --- 1. CORE CARE TYPES ---
export const CARE_TYPES = [
    { id: 'aged_care', label: 'Aged Care', description: 'Support for elderly individuals', icon: User },
    { id: 'disability_care', label: 'Disability Support', description: 'NDIS-style specialized support', icon: Heart },
    { id: 'medical_clinical', label: 'Medical / Clinical', description: 'Nursing and Doctor visits', icon: Stethoscope },
    { id: 'child_care', label: 'Child Care', description: 'Babysitting and pediatric support', icon: Baby },
    { id: 'allied_health', label: 'Allied Health', description: 'Therapy and rehabilitation', icon: Activity },
];

// --- 2. SUPPORT AREAS (Everyday Tasks) ---
export const SUPPORT_AREAS = [
    { id: 'personal_care', label: 'Personal Care', description: 'Showering, dressing, grooming', icon: Bath },
    { id: 'social_support', label: 'Social Support', description: 'Community access and companionship', icon: Users },
    { id: 'domestic_assistance', label: 'Domestic Assistance', description: 'Cleaning, laundry, gardening', icon: Sparkles },
    { id: 'meal_prep', label: 'Meal Preparation', description: 'Cooking and assistance with eating', icon: Utensils },
    { id: 'transport', label: 'Transport', description: 'Driving to appointments or shopping', icon: Truck },
    { id: 'medication_support', label: 'Medication Assistance', description: 'Reminders and safeguards', icon: Pill },
    { id: 'skill_dev', label: 'Skill Development', description: 'Building independence daily', icon: Brain },
    { id: 'behaviour_support', label: 'Behaviour Support', description: 'Managing complex behaviors', icon: Shield },
    { id: 'child_care_service', label: 'Child Care / Babysitting', description: 'Supervision and developmental support', icon: Baby },
    { id: 'telehealth', label: 'Telehealth', description: 'Remote consultations', icon: Activity },
    { id: 'home_safety', label: 'Home Safety', description: 'Fall prevention & modifications', icon: Shield },
    { id: 'assistive_support', label: 'Assistive Tech', description: 'Equipment & device support', icon: Activity },
    { id: 'nursing', label: 'Nursing Care', description: 'Wound care, meds, clinical monitoring', isClinical: true, icon: Syringe },
    { id: 'respite', label: 'Respite Care', description: 'Overnight or temporary relief for carers', icon: Bed },
];

// --- 3. SPECIALISED / CLINICAL COMPETENCIES ---
export const CLINICAL_SKILLS = [
    {
        category: 'Complex Care', items: [
            { id: 'bowel_care', label: 'Bowel Care', icon: Activity },
            { id: 'catheter_care', label: 'Catheter Care', icon: Droplet },
            { id: 'enteral_feeding', label: 'Enteral Feeding (PEG/PEJ)', isClinical: true, icon: Utensils },
            { id: 'tracheostomy', label: 'Tracheostomy Mgmt', isClinical: true, icon: Wind },
            { id: 'ventilator', label: 'Ventilator Support', isClinical: true, icon: Wind },
            { id: 'wound_complex', label: 'Complex Wound Mgmt', isClinical: true, icon: Stethoscope },
            { id: 'manual_handling', label: 'Manual Handling', icon: Activity },
            { id: 'mealtime_mgmt', label: 'Mealtime Management', icon: Utensils },
            { id: 'swallowing', label: 'Swallowing & Nutrition', icon: Utensils },
            { id: 'continence', label: 'Continence Management', icon: Droplet },
        ]
    },
    {
        category: 'Chronic & Conditions', items: [
            { id: 'diabetes_insulin', label: 'Diabetes (Insulin)', requiresCert: true, icon: Syringe },
            { id: 'diabetes_support', label: 'Diabetes Support', icon: Activity },
            { id: 'epilepsy_midazolam', label: 'Seizure (Midazolam)', requiresCert: true, icon: Activity },
            { id: 'epilepsy_support', label: 'Epilepsy / Seizures', icon: Activity },
        ]
    },
    {
        category: 'Behavioral & Cognitive', items: [
            { id: 'dementia', label: 'Dementia Care', icon: Brain },
            { id: 'autism_support', label: 'Autism Support', icon: Smile },
            { id: 'pbs', label: 'Positive Behavior Support', icon: Shield },
            { id: 'behavior_mgmt', label: 'Behaviour Management', icon: AlertTriangle },
        ]
    }
];

// --- 4. ALLIED HEALTH DISCIPLINES ---
// export const ALLIED_HEALTH_TYPES = [
//     { id: 'physio', label: 'Physiotherapist', icon: Dumbbell },
//     { id: 'ot', label: 'Occupational Therapist', icon: Puzzle },
//     { id: 'speech', label: 'Speech Pathologist', icon: MessageCircle },
//     { id: 'psych', label: 'Psychologist', icon: Brain },
//     { id: 'dietitian', label: 'Dietitian', icon: Utensils },
//     { id: 'podiatrist', label: 'Podiatrist', icon: Footprints },
//     { id: 'social_worker', label: 'Social Worker', icon: Users },
//     { id: 'counsellor', label: 'Counsellor', icon: HeartHandshake },
//     { id: 'exercise_phys', label: 'Exercise Physiologist', icon: Activity },
//     { id: 'music_therapist', label: 'Music Therapist', icon: Music },
//     { id: 'arts_therapist', label: 'Arts Therapist', icon: Palette },
//     { id: 'massage', label: 'Massage Therapist', icon: Hand },
//     { id: 'chiropractor', label: 'Chiropractor', icon: Activity },
//     { id: 'audiologist', label: 'Audiologist', icon: Ear },
//     { id: 'optometrist', label: 'Optometrist', icon: Eye },
//     { id: 'orthoptist', label: 'Orthoptist', icon: Eye },
//     { id: 'osteopath', label: 'Osteopath', icon: HelpingHand },
// ];

// --- 5. MOBILITY & FUNCTION ---
// export const MOBILITY_LEVELS = [
//     { id: 'independent', label: 'Independent', risk: 0, icon: Activity },
//     { id: 'assist_1', label: 'Assist x1', description: 'Needs one person to help', risk: 1, icon: User },
//     { id: 'assist_2', label: 'Assist x2', description: 'Needs two people to help', risk: 2, icon: Users },
//     { id: 'hoist_transfer', label: 'Hoist Transfer', description: 'Requires mechanical lifting', risk: 3, requiresTraining: true, icon: AlertOctagon },
// ];

// export const HOME_BARRIERS = [
//     { id: 'stairs', label: 'Stairs', icon: Activity },
//     { id: 'narrow_doors', label: 'Narrow Doorways', icon: DoorOpen },
//     { id: 'bathroom_access', label: 'Difficult Bathroom', icon: Bath },
//     { id: 'pets', label: 'Pets Present', icon: Dog },
// ];

// --- TYPES ---
interface ClinicalNeed {
    id: string;
    label: string;
    isClinical?: boolean;
    requiresCert?: boolean;
}
