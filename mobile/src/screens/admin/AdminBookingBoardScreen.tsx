import { StaffBookingsScreen } from "../management/StaffBookingsScreen";

export function AdminBookingBoardScreen() {
  return (
    <StaffBookingsScreen
      mode="admin-readonly"
      headingTitle="Booking Management"
      headingSubtitle="View and monitor all bookings"
    />
  );
}
