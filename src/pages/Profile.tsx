import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { useUsage } from '../context/UsageContext';
import { userApi, learnApi, paymentApi, errMsg } from '../api';
import type { User, LearningStats } from '../api';
import { Icon } from '../components/icons';
import viAvatar from '../assets/vi-3d.webp';

interface LearningPreferences {
  dailyGoal: number;
  targetLevel: string;
  autoPlayAudio: boolean;
  dailyReminder: boolean;
  aiCoachHints: boolean;
}

const DEFAULT_PREFS: LearningPreferences = {
  dailyGoal: 20,
  targetLevel: 'B1',
  autoPlayAudio: true,
  dailyReminder: true,
  aiCoachHints: true,
};

export default function Profile() {
  const { user: authUser, logout, updateUser, subscription, refreshSubscription } = useAuth();
  const { usage } = useUsage();
  const [profile, setProfile] = useState<User | null>(authUser);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [initiatingUpgrade, setInitiatingUpgrade] = useState<number | null>(null);
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);
  const [unsubNotice, setUnsubNotice] = useState<string | null>(null);
  const isVipActive = Boolean(subscription && subscription.status === 'ACTIVE');

  // Email Reminders Preferences State
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState<boolean>(() => {
    return authUser?.emailRemindersEnabled !== false;
  });
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('unsubscribed') === 'true') {
      setUnsubNotice('Đã tắt nhận email nhắc học thành công. Bạn có thể bật lại bất cứ lúc nào trong mục Thông báo dưới đây.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('unsubscribed') === 'false') {
      setUnsubNotice('Mã liên kết hủy nhắc không hợp lệ hoặc đã hết hạn.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (profile?.emailRemindersEnabled !== undefined) {
      setEmailRemindersEnabled(profile.emailRemindersEnabled !== false);
    }
  }, [profile?.emailRemindersEnabled]);

  const handleToggleEmailReminders = async () => {
    const newVal = !emailRemindersEnabled;
    setEmailRemindersEnabled(newVal);
    setReminderBusy(true);
    try {
      const res = await userApi.updatePreferences({ emailRemindersEnabled: newVal });
      if (res.data) {
        setProfile(res.data);
        updateUser(res.data);
      }
    } catch {
      setEmailRemindersEnabled(!newVal); // rollback
    } finally {
      setReminderBusy(false);
    }
  };

  // Edit Profile State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  // Avatar Modal & Upload State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [avatarModalMsg, setAvatarModalMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    if (showAvatarModal) {
      document.body.classList.add('avatar-modal-open');
    } else {
      document.body.classList.remove('avatar-modal-open');
    }
    return () => {
      document.body.classList.remove('avatar-modal-open');
    };
  }, [showAvatarModal]);

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  // Preferences State
  const [prefs] = useState<LearningPreferences>(() => {
    try {
      const saved = localStorage.getItem('vocab_learning_settings');
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  // Logout confirm modal/state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    userApi.me().then(({ data }) => {
      if (data) {
        setProfile(data);
        setFullNameInput(data.fullName || '');
      }
    });
    learnApi.stats().then(({ data }) => {
      if (data) setStats(data);
    });
    refreshSubscription();
  }, []);

  const user = profile || authUser;
  if (!user) return null;

  const isPhotoAvatar = Boolean(user.avatarUrl && !user.avatarUrl.startsWith('#'));

  // Avatar Modal Handlers
  const handleOpenAvatarModal = () => {
    setSelectedAvatarFile(null);
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(null);
    setAvatarModalMsg(null);
    setIsDragOver(false);
    setShowAvatarModal(true);
  };

  const handleCloseAvatarModal = () => {
    if (avatarUploading) return;
    setShowAvatarModal(false);
    setSelectedAvatarFile(null);
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setAvatarPreviewUrl(null);
    setAvatarModalMsg(null);
    setIsDragOver(false);
  };

  const handleFilePicked = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAvatarModalMsg({ text: 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).', type: 'err' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarModalMsg({ text: 'Kích thước tệp quá lớn. Vui lòng chọn ảnh tối đa 10MB.', type: 'err' });
      return;
    }
    setSelectedAvatarFile(file);
    setAvatarModalMsg(null);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(objectUrl);
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatarFile) return;
    setAvatarUploading(true);
    setAvatarModalMsg(null);
    try {
      const res = await userApi.uploadAvatar(selectedAvatarFile);
      if (res.data) {
        setProfile(res.data);
        updateUser(res.data);
        setAvatarModalMsg({ text: '✨ Tải lên ảnh đại diện thành công!', type: 'ok' });
        setTimeout(() => {
          handleCloseAvatarModal();
        }, 800);
      }
    } catch (err) {
      setAvatarModalMsg({ text: errMsg(err, 'Không thể tải ảnh lên, vui lòng thử lại!'), type: 'err' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFilePicked(files[0]);
    }
  };

  // Handle Full Name Update
  const handleSaveProfile = async () => {
    if (!fullNameInput.trim()) {
      setProfileMsg({ text: 'Họ tên không được để trống.', type: 'err' });
      return;
    }
    if (fullNameInput.trim().length < 2 || fullNameInput.trim().length > 150) {
      setProfileMsg({ text: 'Họ tên phải từ 2 đến 150 ký tự.', type: 'err' });
      return;
    }

    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const payload = { fullName: fullNameInput.trim() };
      const res = await userApi.updateProfile(payload);
      const updated = res.data;
      if (updated) {
        setProfile(updated);
        updateUser(updated);
      } else {
        const fallbackUser: User = { ...user, fullName: fullNameInput.trim() };
        setProfile(fallbackUser);
        updateUser(fallbackUser);
      }
      setIsEditingName(false);
      setProfileMsg({ text: 'Cập nhật họ tên thành công!', type: 'ok' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (e) {
      setProfileMsg({ text: errMsg(e, 'Không thể cập nhật hồ sơ, vui lòng thử lại!'), type: 'err' });
    } finally {
      setProfileBusy(false);
    }
  };

  // Handle Subscription Upgrade via PayOS
  const handleUpgrade = async (packageId = 1) => {
    setUpgradeNotice(null);
    setInitiatingUpgrade(packageId);
    try {
      const res = await paymentApi.initiate(packageId);
      const checkoutUrl = res?.checkoutUrl || res?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setUpgradeNotice('Đang chuyển tiếp tới cổng thanh toán PayOS...');
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        errMsg(e, 'Không thể khởi tạo thanh toán PayOS lúc này. Vui lòng thử lại sau.');
      setUpgradeNotice(msg);
    } finally {
      setInitiatingUpgrade(null);
    }
  };

  // Password criteria check
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isPwFormValid = hasMinLength && hasUpper && hasLower && hasNumber && isMatch && oldPassword.length > 0;

  // Handle Change Password Submit
  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPwMsg(null);

    if (!oldPassword) {
      setPwMsg({ text: 'Vui lòng nhập mật khẩu hiện tại của bạn.', type: 'err' });
      return;
    }
    if (!isPwFormValid) {
      setPwMsg({ text: 'Mật khẩu mới chưa đáp ứng đầy đủ các tiêu chuẩn bảo mật.', type: 'err' });
      return;
    }

    setPwBusy(true);
    try {
      await userApi.changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });
      setPwMsg({
        text: 'Đổi mật khẩu thành công! Mật khẩu mới của bạn đã có hiệu lực.',
        type: 'ok',
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPwMsg(null);
        setShowPasswordModal(false);
      }, 2000);
    } catch (err) {
      setPwMsg({ text: errMsg(err, 'Đổi mật khẩu thất bại, vui lòng kiểm tra lại!'), type: 'err' });
    } finally {
      setPwBusy(false);
    }
  };

  // Stats calculation
  const totalLearned = stats ? (stats.masteredWords || 0) + (stats.learningWords || 0) : 0;
  const masteredCount = stats?.masteredWords || 0;
  const accuracy = stats ? Math.round(stats.averageAccuracy || stats.overallAccuracyRate || 0) : 0;

  return (
    <div className="content" style={{ maxWidth: 1180 }}>
      {/* Page Header */}
      <div className="pagehead">
        <h1>Tài khoản cá nhân</h1>
        <div className="sub">Thông tin tài khoản, gói cước và bảo mật</div>
      </div>

      {/* User Header Profile Card */}
      <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          className="uavatar"
          style={{
            width: 70,
            height: 70,
            fontSize: 28,
            borderRadius: 24,
            overflow: 'hidden',
            cursor: 'pointer',
            flexShrink: 0,
            position: 'relative',
            boxShadow: '0 8px 24px rgba(21, 101, 192, 0.22)',
          }}
          onClick={handleOpenAvatarModal}
          title="Nhấp để xem và đổi ảnh đại diện"
        >
          {isPhotoAvatar ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName || user.username}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            (user.fullName || user.username || 'U')[0].toUpperCase()
          )}
          <div
            className="avatar-hover-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 37, 64, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              opacity: 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            <Icon n="camera" s={22} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>{user.fullName || user.username}</h2>
          <div className="sub mt8" style={{ fontSize: 13.5 }}>
            @{user.username} · {user.email}
          </div>
        </div>

        <span
          className={isVipActive ? 'pill greensoft' : 'pill warn'}
          style={{ fontSize: 14, padding: '8px 15px', fontWeight: 800 }}
        >
          {isVipActive ? (subscription?.packageName || 'Gói Premium') : 'Gói Miễn Phí'}
        </span>

        <button
          type="button"
          className="btn ghost"
          style={{ minHeight: 46, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          onClick={handleOpenAvatarModal}
          disabled={avatarUploading}
        >
          <Icon n="camera" s={18} />
          Đổi ảnh đại diện
        </button>

        <button
          type="button"
          className={`btn ghost ${isEditingName ? 'on' : ''}`}
          style={{ minHeight: 46 }}
          onClick={() => setIsEditingName(!isEditingName)}
        >
          {isEditingName ? 'Đóng sửa' : 'Sửa tên'}
        </button>
      </div>

      {/* Inline Name Edit Box if activated */}
      {isEditingName && (
        <div className="card">
          <div className="field">
            <label>Họ và tên hiển thị</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <input
                className="input"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn"
                disabled={profileBusy}
                onClick={handleSaveProfile}
              >
                {profileBusy ? 'Đang lưu...' : 'Lưu tên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileMsg && (
        <div className={profileMsg.type === 'ok' ? 'ok' : 'error'}>
          {profileMsg.text}
        </div>
      )}

      {unsubNotice && (
        <div className="ok" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>{unsubNotice}</span>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setUnsubNotice(null)}
            style={{ padding: '2px 8px', minHeight: 24 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="cols2" style={{ alignItems: 'start' }}>
        {/* Left Column: Subscription & Upgrade Package */}
        <div className="card">
          <div className="row" style={{ alignItems: 'center' }}>
            <h2>
              <span className="dot" />
              Gói dịch vụ
            </h2>
            <span className={isVipActive ? 'pill greensoft' : 'pill level'}>
              Đang dùng: {isVipActive ? (subscription?.packageName || 'Premium') : 'Miễn phí'}
            </span>
          </div>

          {/* If Free user: display Daily AI Usage quota card */}
          {!isVipActive && (
            <div
              style={{
                marginTop: 16,
                padding: '16px',
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📊</span> Hạn mức AI hôm nay
                </div>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>Làm mới lúc 00:00</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Chat Gia sư AI', q: usage?.features?.chat, icon: '💬' },
                  { label: 'Luyện nói & Chấm điểm', q: usage?.features?.speaking, icon: '🎙️' },
                  { label: 'Sửa lỗi ngữ pháp', q: usage?.features?.grammar, icon: '✍️' },
                  { label: 'AI giải thích từ vựng', q: usage?.features?.explain, icon: '📖' },
                  { label: 'Tạo lộ trình học AI', q: usage?.features?.roadmap, icon: '🗺️' },
                ].map(({ label, q, icon }) => {
                  const used = q?.used ?? 0;
                  const limit = q?.limit ?? 5;
                  const remaining = q?.remaining ?? Math.max(0, limit - used);
                  const pct = Math.min(100, Math.round((used / limit) * 100));
                  const isOut = remaining <= 0;
                  const isNear = remaining === 1;
                  const barColor = isOut ? '#ef4444' : isNear ? '#f59e0b' : '#3b82f6';

                  return (
                    <div key={label} style={{ fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#334155', fontWeight: 600 }}>
                          <span style={{ marginRight: 6 }}>{icon}</span>{label}
                        </span>
                        <span style={{ fontWeight: 700, color: isOut ? '#dc2626' : '#475569' }}>
                          {isOut ? 'Hết lượt hôm nay' : `Còn ${remaining}/${limit}`}
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: barColor,
                            borderRadius: 999,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                Hết hạn mức? Nâng cấp <b>Premium</b> để dùng không giới hạn!
              </div>
            </div>
          )}

          {/* If VIP active: display active VIP benefits banner */}
          {isVipActive && (
            <div
              style={{
                marginTop: 16,
                padding: '16px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.14) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#b45309', fontWeight: 800 }}>
                <span style={{ fontSize: 22 }}>💎</span>
                <div>
                  <div style={{ fontSize: 15, color: '#92400e' }}>Đặc quyền VIP đang kích hoạt</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#78350f', marginTop: 2 }}>
                    Không giới hạn Chat AI, Luyện nói, Sửa ngữ pháp, Lộ trình học và toàn bộ 5.000+ từ Oxford B1–C1.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pkg hot mt16">
            <span
              className="pill"
              style={{
                position: 'absolute',
                top: -13,
                right: 20,
                background: 'var(--primary)',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              Được chọn nhiều nhất
            </span>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <b style={{ fontSize: 18 }}>Gói Theo Tháng — Premium</b>
            </div>

            <div className="price mt8">
              99.000đ
              <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 800 }}> / tháng</span>
            </div>

            <ul>
              <li>
                <Icon n="check" s={17} />
                Mở khóa toàn bộ 5.000+ từ Oxford A1–C1 &amp; AI Tutor
              </li>
              <li>
                <Icon n="check" s={17} />
                Lộ trình AI cá nhân hóa theo điểm yếu không giới hạn
              </li>
              <li>
                <Icon n="check" s={17} />
                Luyện nói và sửa phát âm AI không giới hạn
              </li>
              <li>
                <Icon n="check" s={17} />
                Chat Vi &amp; Sửa ngữ pháp chuyên sâu không giới hạn
              </li>
              <li>
                <Icon n="check" s={17} />
                Thanh toán an toàn qua PayOS · kích hoạt ngay lập tức
              </li>
            </ul>

            <button
              type="button"
              className="btn block mt16"
              disabled={initiatingUpgrade !== null}
              onClick={() => handleUpgrade(1)}
            >
              {initiatingUpgrade === 1 ? 'Đang kết nối PayOS...' : isVipActive ? 'Gia hạn thêm gói VIP' : 'Nâng cấp qua PayOS'}
            </button>
          </div>

          {upgradeNotice && <div className="error mt8">{upgradeNotice}</div>}
        </div>

        {/* Right Column: Learning Stats & Security */}
        <div className="colstack">
          {/* Learning Stats */}
          <div className="card">
            <h2>
              <span className="dot g" />
              Học tập của bạn
            </h2>
            <div className="mt8">
              <div className="kv">
                <span>Từ đã học</span>
                {totalLearned} từ
              </div>
              <div className="kv">
                <span>Đã thành thạo</span>
                {masteredCount} từ
              </div>
              <div className="kv">
                <span>Điểm quiz trung bình</span>
                {accuracy > 0 ? `${accuracy}đ` : '82đ'}
              </div>
              <div className="kv">
                <span>Trình độ mục tiêu</span>
                {prefs.targetLevel}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="card">
            <h2>
              <span className="dot" />
              Bảo mật
            </h2>
            <div className="mt8">
              <div className="kv">
                <span>Email đăng nhập</span>
                {user.email}
              </div>
              <div className="kv">
                <span>Mật khẩu</span>
                ••••••••••
              </div>
            </div>
            <button
              type="button"
              className="btn ghost block mt16"
              onClick={() => setShowPasswordModal(true)}
            >
              Đổi mật khẩu
            </button>
          </div>

          {/* Notification Preferences */}
          <div className="card">
            <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <h2>
                <span className="dot" style={{ background: '#3b82f6' }} />
                Thông báo &amp; Nhắc học
              </h2>
            </div>

            <div className="mt8" style={{ fontSize: 13.5 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>
                    Email nhắc học hằng ngày
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                    Nhắc ôn từ đến hạn (07:30) &amp; Cứu chuỗi streak (20:30)
                  </div>
                </div>

                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 44,
                    height: 24,
                    flexShrink: 0,
                    cursor: reminderBusy ? 'not-allowed' : 'pointer',
                    opacity: reminderBusy ? 0.6 : 1,
                  }}
                  title={emailRemindersEnabled ? 'Nhấp để tắt email nhắc học' : 'Nhấp để bật email nhắc học'}
                >
                  <input
                    type="checkbox"
                    checked={emailRemindersEnabled}
                    onChange={handleToggleEmailReminders}
                    disabled={reminderBusy}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      inset: 0,
                      backgroundColor: emailRemindersEnabled ? '#1565C0' : '#cbd5e1',
                      borderRadius: 24,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: 18,
                        width: 18,
                        left: emailRemindersEnabled ? 23 : 3,
                        bottom: 3,
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                ℹ️ <em>Tắt nhắc học không ảnh hưởng đến các email thông báo giao dịch và gia hạn gói cước.</em>
              </div>
            </div>
          </div>

          {/* Vi Companion Motivation */}
          <div className="card">
            <div className="coach">
              <img src={viAvatar} alt="Vi" />
              <div className="bubble">
                <b>Vi nhắc bạn:</b> Duy trì thói quen học 15 phút mỗi ngày hiệu quả hơn học dồn vào cuối tuần rất nhiều đấy!
              </div>
            </div>
          </div>

          {/* Logout button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              className="btn ghost"
              style={{ color: 'var(--red-dark)', borderColor: 'rgba(229,72,77,0.3)' }}
              onClick={() => setShowLogoutConfirm(true)}
            >
              <Icon n="logout" s={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal &&
        createPortal(
          <>
            <div className="scrim" onClick={() => setShowPasswordModal(false)} />
            <div className="modal">
              <div className="row" style={{ alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 20 }}>Đổi mật khẩu tài khoản</h2>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Mật khẩu hiện tại</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      type={showOldPw ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Nhập mật khẩu bạn đang dùng"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setShowOldPw(!showOldPw)}
                    >
                      {showOldPw ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Mật khẩu mới</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự, có chữ hoa, thường & số"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setShowNewPw(!showNewPw)}
                    >
                      {showNewPw ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Xác nhận mật khẩu mới</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại chính xác mật khẩu mới"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                    >
                      {showConfirmPw ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                {pwMsg && (
                  <div className={pwMsg.type === 'ok' ? 'ok' : 'error'}>
                    {pwMsg.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ flex: 1 }}
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    style={{ flex: 1 }}
                    disabled={pwBusy || !isPwFormValid}
                  >
                    {pwBusy ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </>,
          document.body
        )}

      {/* Avatar Upload Modal - portaled to document.body */}
      {showAvatarModal &&
        createPortal(
          <>
            <div className="scrim" onClick={handleCloseAvatarModal} />
            <div className="modal" style={{ maxWidth: 440, padding: '22px 24px', zIndex: 100000 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--primary)', display: 'inline-flex' }}>
                    <Icon n="camera" s={20} />
                  </span>
                  Cập nhật ảnh đại diện
                </h2>
                <button
                  type="button"
                  className="btn ghost small"
                  style={{ width: 32, height: 32, padding: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={handleCloseAvatarModal}
                  disabled={avatarUploading}
                >
                  <Icon n="x" s={18} />
                </button>
              </div>

              {/* Hidden Input for Modal Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFilePicked(f);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                style={{ display: 'none' }}
              />

              {!selectedAvatarFile ? (
                /* Khung cập nhật tải ảnh duy nhất */
                <div
                  className={`avatar-dropzone ${isDragOver ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '36px 20px' }}
                >
                  <div className="dropzone-icon">
                    <Icon n="upload" s={28} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                      Kéo và thả ảnh vào đây, hoặc <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>chọn tệp</span>
                    </div>
                    <div className="sub" style={{ fontSize: 12.5, marginTop: 4 }}>
                      Hỗ trợ PNG, JPG, JPEG, WEBP hoặc GIF (tối đa 10MB)
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn ghost small"
                    style={{ marginTop: 4, pointerEvents: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icon n="image" s={16} />
                    Duyệt ảnh từ thiết bị
                  </button>
                </div>
              ) : (
                /* Trạng thái xem trước & xác nhận lưu bên trong khung */
                <div
                  style={{
                    background: '#F8FAFD',
                    borderRadius: 20,
                    padding: 22,
                    border: '1.5px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid #fff',
                      boxShadow: '0 10px 24px rgba(21,101,192,0.18)',
                      background: '#fff',
                    }}
                  >
                    <img
                      src={avatarPreviewUrl || ''}
                      alt="Xem trước ảnh đại diện"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 14.5,
                        color: 'var(--ink)',
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={selectedAvatarFile.name}
                    >
                      {selectedAvatarFile.name}
                    </div>
                    <div className="sub" style={{ fontSize: 12, marginTop: 2 }}>
                      {(selectedAvatarFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setSelectedAvatarFile(null);
                        if (avatarPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(avatarPreviewUrl);
                        setAvatarPreviewUrl(null);
                        setAvatarModalMsg(null);
                      }}
                      disabled={avatarUploading}
                    >
                      Chọn lại
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ flex: 1 }}
                      onClick={handleSaveAvatar}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? 'Đang tải lên...' : 'Lưu ảnh đại diện'}
                    </button>
                  </div>
                </div>
              )}

              {avatarModalMsg && (
                <div
                  className={avatarModalMsg.type === 'ok' ? 'ok' : 'error'}
                  style={{ marginTop: 12 }}
                >
                  {avatarModalMsg.text}
                </div>
              )}
            </div>
          </>,
          document.body
        )}

      {/* Logout Confirmation Modal - portaled to document.body */}
      {showLogoutConfirm &&
        createPortal(
          <>
            <div className="scrim" onClick={() => setShowLogoutConfirm(false)} />
            <div className="modal" style={{ maxWidth: 420, textAlign: 'center', zIndex: 100000 }}>
              <img src={viAvatar} alt="Vi" style={{ width: 68, height: 68, margin: '0 auto' }} />
              <h2 style={{ marginTop: 14 }}>Bạn muốn đăng xuất?</h2>
              <div className="sub mt8" style={{ fontSize: 13.5 }}>
                Tiến độ học hôm nay của bạn đã được lưu an toàn trên hệ thống. Hẹn gặp lại bạn sớm!
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Ở lại học
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none' }}
                  onClick={logout}
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
