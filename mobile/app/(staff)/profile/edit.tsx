// TODO: Staff self-managed profile settings (PE-01) — see M5_MOBILE_DESIGN_SPEC.md § 5.3 Profile Settings
// Avatar: tap to change (expo-image-picker → presign upload → PATCH avatarUrl)
// Non-editable: Full Name, Role (set by admin)
// Personal: DOB (DatePicker), Gender (select), Nationality (country picker)
// Professional: Years of Experience (number), Languages (multi-select chips), Bio (textarea max 500)
// Internal (verification only): Qatar ID, Emergency Contact Name/Phone
// API: GET /api/users/me/profile  PATCH /api/users/me/profile
//      POST /api/users/me/avatar (presigned upload)
import { View } from 'react-native';

export default function StaffProfileEditScreen() {
  return <View />;
}
