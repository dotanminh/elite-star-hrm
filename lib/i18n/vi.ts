/**
 * Elite Star HRM - Vietnamese Translation Strings
 * File chuỗi tập trung cho toàn bộ giao diện tiếng Việt.
 */

// --- Navigation ---
export const nav = {
  brandName: 'Elite Star',
  brandSubtitle: 'Hệ Thống Nhân Sự',
  overview: 'Tổng quan',
  employees: 'Nhân viên',
  leaveRequests: 'Nghỉ phép',
  attendance: 'Chấm công',
  auditLogs: 'Nhật ký',
  logout: 'Đăng xuất',
} as const;

// --- Roles ---
export const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên',
  hr: 'Nhân sự',
  manager: 'Quản lý',
  employee: 'Nhân viên',
};

// --- Employee Status ---
export const statusLabels: Record<string, string> = {
  active: 'Đang làm việc',
  suspended: 'Tạm nghỉ',
  terminated: 'Đã nghỉ việc',
};

// --- Leave Types ---
export const leaveTypeLabels: Record<string, string> = {
  annual: 'Phép năm',
  sick: 'Phép bệnh',
  unpaid: 'Nghỉ không lương',
  maternity: 'Thai sản',
  other: 'Khác',
};

// --- Leave Status ---
export const leaveStatusLabels: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

// --- Attendance Status ---
export const attendanceStatusLabels: Record<string, string> = {
  present: 'Có mặt',
  late: 'Đi muộn',
  absent: 'Vắng mặt',
  half_day: 'Nửa ngày',
  on_leave: 'Đang nghỉ phép',
};

// --- Audit Actions ---
export const auditActionLabels: Record<string, string> = {
  create_user: 'Tạo nhân viên',
  update_user: 'Cập nhật nhân viên',
  delete_user: 'Xóa nhân viên',
  approve_leave: 'Duyệt nghỉ phép',
  reject_leave: 'Từ chối nghỉ phép',
  create_leave: 'Tạo đơn nghỉ phép',
  check_in: 'Chấm công vào',
  check_out: 'Chấm công ra',
  update_profile: 'Cập nhật hồ sơ',
  create_employee: 'Tạo nhân viên',
};

// --- Login Page ---
export const login = {
  title: 'Elite Star HRM',
  subtitle: 'Hệ thống Quản lý Nhân sự & Chấm công',
  emailLabel: 'Địa chỉ Email',
  emailPlaceholder: 'nhanvien@elitestar.vn',
  passwordLabel: 'Mật khẩu',
  passwordPlaceholder: '••••••••',
  signIn: 'Đăng nhập',
  signingIn: 'Đang đăng nhập...',
  footer: 'Cổng bảo mật. Nội quy Elite Star được áp dụng.',
  errors: {
    emailRequired: 'Vui lòng nhập email',
    emailInvalid: 'Email không đúng định dạng',
    passwordRequired: 'Vui lòng nhập mật khẩu',
    invalidCredentials: 'Email hoặc mật khẩu không đúng',
    unexpected: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  },
} as const;

// --- Dashboard Page ---
export const dashboard = {
  title: 'Tổng Quan',
  subtitle: 'Theo dõi chỉ số hoạt động theo thời gian thực của Elite Star.',
  activeRoster: 'Nhân sự hoạt động',
  activeRosterDesc: 'Đang làm việc',
  checkedInToday: 'Đã chấm công hôm nay',
  checkedInTodayDesc: 'Có mặt tại cơ sở',
  onLeaveToday: 'Đang nghỉ phép',
  onLeaveTodayDesc: 'Nghỉ phép được duyệt',
  attendanceRate: 'Tỷ lệ chấm công',
  attendanceRateDesc: 'Trên tổng nhân sự',
  recentAttendance: 'Chấm công gần đây',
  verifyCheckIns: 'Xem chi tiết',
  employee: 'Nhân viên',
  checkIn: 'Giờ vào',
  checkOut: 'Giờ ra',
  status: 'Trạng thái',
  noAttendanceToday: 'Chưa có ai chấm công hôm nay.',
  pendingApprovals: 'Đơn chờ duyệt',
  queue: 'Xem tất cả',
  noPendingRequests: 'Không có đơn chờ duyệt. Tuyệt vời!',
  to: 'đến',
} as const;

// --- Employee Page ---
export const employees = {
  title: 'Danh Sách Nhân Viên',
  subtitle: 'Tìm kiếm và quản lý nhân sự, huấn luyện viên, nhân viên phục vụ.',
  addEmployee: 'Thêm nhân viên',
  searchPlaceholder: 'Tìm theo tên hoặc email...',
  allDepartments: 'Tất cả phòng ban',
  allPositions: 'Tất cả chức danh',
  fetchingRecords: 'Đang tải danh sách...',
  name: 'Họ tên',
  contact: 'Liên hệ',
  departmentTitle: 'Phòng ban & Chức danh',
  statusRole: 'Trạng thái & Vai trò',
  hireDate: 'Ngày vào làm',
  action: 'Thao tác',
  unassigned: 'Chưa phân công',
  noPosition: 'Chưa có chức danh',
  noResults: 'Không tìm thấy nhân viên phù hợp.',
  // Add Modal
  addTitle: 'Thêm Nhân Viên Mới',
  emailAddress: 'Địa chỉ Email',
  roleType: 'Vai trò',
  roleEmployee: 'Nhân viên (Nhân sự chung)',
  roleManager: 'Quản lý (Trưởng bộ phận)',
  roleHR: 'Nhân sự (Chuyên viên HR)',
  firstName: 'Tên',
  lastName: 'Họ',
  phoneNumber: 'Số điện thoại',
  department: 'Phòng ban',
  jobTitle: 'Chức danh',
  noTitle: 'Chưa chọn',
  cancel: 'Hủy',
  registerSave: 'Đăng ký & Lưu',
  // Edit Modal
  editTitle: 'Chỉnh Sửa Hồ Sơ',
  emailImmutable: 'Email (không đổi)',
  statusLabel: 'Trạng thái',
  systemRole: 'Vai trò hệ thống',
  saveChanges: 'Lưu thay đổi',
  // Errors
  errors: {
    emailFirstLastRequired: 'Email, Tên và Họ là bắt buộc',
    firstLastRequired: 'Tên và Họ là bắt buộc',
    creationEmpty: 'Tạo tài khoản không trả về ID',
    creationError: 'Đã xảy ra lỗi khi tạo nhân viên',
    updateError: 'Đã xảy ra lỗi khi cập nhật thông tin',
  },
} as const;

// --- Leave Page ---
export const leave = {
  title: 'Quản Lý Nghỉ Phép',
  subtitle: 'Gửi đơn xin nghỉ hoặc duyệt đơn nghỉ phép của bộ phận.',
  submitRequest: 'Gửi Đơn Nghỉ Phép',
  leaveType: 'Loại nghỉ phép',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  reasonDescription: 'Lý do nghỉ phép',
  reasonPlaceholder: 'Mô tả ngắn gọn lý do (ví dụ: khám bệnh, du lịch, nghỉ ngơi)...',
  submitBtn: 'Gửi đơn',
  submitting: 'Đang gửi...',
  approvalQueue: 'Đơn Chờ Duyệt',
  pending: 'Chờ duyệt',
  duration: 'Thời gian:',
  to: 'đến',
  response: 'Phản hồi:',
  commentPlaceholder: 'Nhập nhận xét / lý do...',
  cancelBtn: 'Hủy',
  confirmReject: 'Xác nhận Từ chối',
  confirmApprove: 'Xác nhận Duyệt',
  processDecision: 'Xử lý',
  noRequests: 'Không có đơn nghỉ phép nào trong bộ phận.',
  myRequests: 'Đơn Nghỉ Phép Của Tôi',
  loading: 'Đang tải...',
  noMyRequests: 'Bạn chưa gửi đơn nghỉ phép nào.',
  reasonResponse: 'Nhận xét:',
  errors: {
    fillAllFields: 'Vui lòng điền đầy đủ thông tin',
    endDateInvalid: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    submitSuccess: 'Gửi đơn nghỉ phép thành công',
    submitError: 'Đã xảy ra lỗi khi gửi đơn',
    approvalError: 'Không thể xử lý quyết định duyệt đơn',
  },
} as const;

// --- Attendance Page ---
export const attendance = {
  title: 'Chấm Công',
  subtitle: 'Ghi nhận giờ vào - ra hàng ngày với xác minh IP.',
  terminal: 'Bảng Chấm Công Elite Star',
  ipLogged: 'IP đã ghi nhận:',
  notesLabel: 'Ghi chú ca làm (Tùy chọn)',
  notesPlaceholder: 'Ghi chú công việc hoặc lời nhắn...',
  checkInBtn: 'Chấm Công Vào',
  checkOutBtn: 'Chấm Công Ra',
  doneMessage: 'Đã chấm công đầy đủ hôm nay. Làm việc tốt lắm!',
  logTrail: 'Lịch Sử Chấm Công (30 ngày gần đây)',
  shiftStart: 'Ca làm: 06:00 - 21:30',
  date: 'Ngày',
  checkIn: 'Giờ vào',
  checkOut: 'Giờ ra',
  status: 'Trạng thái',
  loadingList: 'Đang tải danh sách chấm công...',
  noRecords: 'Chưa có bản ghi chấm công nào.',
  errors: {
    checkInFailed: 'Chấm công vào thất bại. Vui lòng thử lại.',
    checkOutFailed: 'Chấm công ra thất bại. Vui lòng thử lại.',
  },
} as const;

// --- Audit Logs Page ---
export const auditLogs = {
  title: 'Nhật Ký Hệ Thống',
  subtitle: 'Theo dõi lịch sử thao tác quản trị, tạo nhân viên, và quyết định nghỉ phép.',
  searchPlaceholder: 'Tìm theo người thực hiện, bảng, hoặc hành động...',
  allActionTypes: 'Tất cả loại hành động',
  loading: 'Đang tải nhật ký hệ thống...',
  oldState: 'Giá trị cũ',
  noOldState: 'Không có (Sự kiện tạo mới)',
  newState: 'Giá trị mới',
  noNewState: 'Không có (Sự kiện xóa)',
  noResults: 'Không tìm thấy nhật ký phù hợp với bộ lọc.',
} as const;

// --- Common ---
export const common = {
  loading: 'Đang tải...',
  save: 'Lưu',
  cancel: 'Hủy',
  edit: 'Sửa',
  delete: 'Xóa',
  confirm: 'Xác nhận',
  search: 'Tìm kiếm',
  filter: 'Lọc',
  noData: 'Không có dữ liệu',
  to: 'đến',
} as const;
