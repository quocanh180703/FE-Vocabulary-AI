import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { userApi, learnApi, paymentApi, errMsg } from '../api';
import type { User, LearningStats } from '../api';
import { Icon, Mascot } from '../components/icons';
import { useNavigate } from 'react-router-dom';

type Tab = 'overview' | 'security' | 'preferences' | 'statistics';

interface LearningPreferences {
  dailyGoal: number; // 10, 20, 30, 50
  targetLevel: string; // A1, A2, B1, B2, C1
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

const AVATAR_COLORS = [
  { id: '#1565C0', label: 'Xanh dương' },
  { id: '#1E7E46', label: 'Xanh lá' },
  { id: '#7C3AED', label: 'Tím đậm' },
  { id: '#D97706', label: 'Cam vàng' },
  { id: '#E5484D', label: 'Đỏ ruby' },
  { id: '#0D9488', label: 'Xanh ngọc' },
];

export default function Profile() {
  const { user: authUser, logout, updateUser, subscription, refreshSubscription } = useAuth();
  const [profile, setProfile] = useState<User | null>(authUser);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [initiatingUpgrade, setInitiatingUpgrade] = useState<number | null>(null);
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);
  const nav = useNavigate();
  const isVipActive = Boolean(subscription && subscription.status === 'ACTIVE');

  // Edit Profile State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [selectedAvatarColor, setSelectedAvatarColor] = useState('#1565C0');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarTab, setAvatarTab] = useState<'upload' | 'color'>('upload');
  const [avatarHover, setAvatarHover] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  // Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  // Preferences State
  const [prefs, setPrefs] = useState<LearningPreferences>(() => {
    try {
      const saved = localStorage.getItem('vocab_learning_settings');
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });
  const [prefsSavedMsg, setPrefsSavedMsg] = useState(false);

  // Logout confirm modal/state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    userApi.me().then(({ data }) => {
      if (data) {
        setProfile(data);
        setFullNameInput(data.fullName || '');
        if (data.avatarUrl && data.avatarUrl.startsWith('#')) {
          setSelectedAvatarColor(data.avatarUrl);
          setAvatarTab('color');
        } else if (data.avatarUrl && !data.avatarUrl.startsWith('#')) {
          setAvatarTab('upload');
        }
      }
    });
    learnApi.stats().then(({ data }) => {
      if (data) setStats(data);
    });
    refreshSubscription();
  }, []);

  const user = profile || authUser;
  if (!user) return null;

  // Initial avatar color from user if present
  const currentAvatarBg = user.avatarUrl && user.avatarUrl.startsWith('#') ? user.avatarUrl : selectedAvatarColor;
  const isPhotoAvatar = Boolean(user.avatarUrl && !user.avatarUrl.startsWith('#'));

  // Handle Avatar Image Upload to Cloudinary
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMsg({ text: 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).', type: 'err' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileMsg({ text: 'Kích thước tệp quá lớn. Vui lòng chọn ảnh tối đa 10MB.', type: 'err' });
      return;
    }

    setAvatarUploading(true);
    setProfileMsg(null);
    try {
      const res = await userApi.uploadAvatar(file);
      if (res.data) {
        setProfile(res.data);
        updateUser(res.data);
        setAvatarTab('upload');
        setProfileMsg({ text: '✨ Tải lên ảnh đại diện thành công và đã lưu trên Cloudinary!', type: 'ok' });
        setTimeout(() => setProfileMsg(null), 4000);
      }
    } catch (err) {
      setProfileMsg({ text: errMsg(err, 'Không thể tải ảnh lên, vui lòng thử lại!'), type: 'err' });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Remove Avatar Image
  const handleDeleteAvatar = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh đại diện và quay về màu mặc định không?')) return;
    setAvatarUploading(true);
    setProfileMsg(null);
    try {
      const res = await userApi.deleteAvatar();
      if (res.data) {
        setProfile(res.data);
        updateUser(res.data);
        setProfileMsg({ text: 'Đã xóa ảnh đại diện thành công!', type: 'ok' });
        setTimeout(() => setProfileMsg(null), 4000);
      }
    } catch (err) {
      setProfileMsg({ text: errMsg(err, 'Không thể xóa ảnh đại diện, vui lòng thử lại!'), type: 'err' });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle Full Name and Avatar Update
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
      const payload: { fullName: string; avatarUrl?: string } = {
        fullName: fullNameInput.trim(),
      };
      // If user switched to color tab, update avatar to selected color
      if (avatarTab === 'color') {
        payload.avatarUrl = selectedAvatarColor;
      }

      const res = await userApi.updateProfile(payload);
      const updated = res.data;
      if (updated) {
        setProfile(updated);
        updateUser(updated);
      } else {
        const fallbackUser: User = {
          ...user,
          fullName: fullNameInput.trim(),
          avatarUrl: avatarTab === 'color' ? selectedAvatarColor : user.avatarUrl,
        };
        setProfile(fallbackUser);
        updateUser(fallbackUser);
      }
      setIsEditingName(false);
      setProfileMsg({ text: 'Cập nhật thông tin cá nhân thành công!', type: 'ok' });
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

  // Password Strength Score
  const getPasswordStrength = (p: string) => {
    if (!p) return { score: 0, label: 'Chưa nhập', color: '#64748B' };
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;

    if (s <= 2) return { score: 1, label: 'Yếu', color: 'var(--red)' };
    if (s <= 4) return { score: 2, label: 'Trung bình', color: 'var(--yellow)' };
    return { score: 3, label: 'Mạnh & An toàn', color: 'var(--green)' };
  };
  const pwStrength = getPasswordStrength(newPassword);

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
      setTimeout(() => setPwMsg(null), 5000);
    } catch (err) {
      const raw = errMsg(err, 'Đổi mật khẩu thất bại, vui lòng kiểm tra lại!');
      let translated = raw;
      if (raw.toLowerCase().includes('old password') || raw.toLowerCase().includes('incorrect')) {
        translated = 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại!';
      } else if (raw.toLowerCase().includes('password') && raw.toLowerCase().includes('pattern')) {
        translated = 'Mật khẩu mới phải có tối thiểu 8 ký tự, gồm ít nhất 1 chữ in hoa, 1 chữ thường và 1 chữ số.';
      }
      setPwMsg({ text: translated, type: 'err' });
    } finally {
      setPwBusy(false);
    }
  };

  // Handle Preferences Save
  const handleSavePreferences = (newPrefs: LearningPreferences) => {
    setPrefs(newPrefs);
    localStorage.setItem('vocab_learning_settings', JSON.stringify(newPrefs));
    localStorage.setItem('vocab_daily_goal', String(newPrefs.dailyGoal));
    window.dispatchEvent(new CustomEvent('vocab_settings_changed', { detail: newPrefs }));
    setPrefsSavedMsg(true);
    setTimeout(() => setPrefsSavedMsg(false), 3000);
  };

  // Stats calculation
  const totalLearned = stats ? (stats.masteredWords || 0) + (stats.learningWords || 0) : 0;
  const masteredCount = stats?.masteredWords || 0;
  const learningCount = stats?.learningWords || 0;
  const reviewCount = stats?.wordsNeedingReview || 0;
  const accuracy = stats ? Math.round(stats.averageAccuracy || stats.overallAccuracyRate || 0) : 0;
  const masteredPercent = totalLearned > 0 ? Math.round((masteredCount / totalLearned) * 100) : 0;

  const copyUsername = () => {
    if (user.username) {
      navigator.clipboard.writeText(user.username);
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    }
  };

  return (
    <div className="content narrow">
      <div className="pagehead">
        <h1>Tài khoản cá nhân</h1>
        <div className="sub">Quản lý hồ sơ, bảo mật mật khẩu và thiết lập lộ trình học tập</div>
      </div>

      {/* Profile Overview Card */}
      <div className="card" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F9FBFE 100%)' }}>
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Hidden Cloudinary File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileSelect}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              style={{ display: 'none' }}
            />

            {/* Interactive Avatar Container */}
            <div
              style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              onClick={() => fileInputRef.current?.click()}
              title="Nhấp để tải ảnh đại diện lên Cloudinary"
            >
              <div
                className="uavatar"
                style={{
                  width: 72,
                  height: 72,
                  fontSize: 32,
                  background: isPhotoAvatar ? '#F1F5F9' : currentAvatarBg,
                  boxShadow: '0 4px 14px rgba(21, 101, 192, 0.22)',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '3px solid #FFFFFF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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

                {/* Hover overlay with Camera Icon */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(10, 37, 64, 0.65)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    opacity: avatarHover || avatarUploading ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    borderRadius: '50%',
                  }}
                >
                  {avatarUploading ? (
                    <div style={{ textAlign: 'center', transform: 'scale(0.85)' }}>
                      <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', width: 22, height: 22 }} />
                    </div>
                  ) : (
                    <>
                      <Icon n="camera" s={18} />
                      <span style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>Đổi ảnh</span>
                    </>
                  )}
                </div>
              </div>

              {/* Camera Badge in bottom right */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--brand)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  border: '2px solid #fff',
                }}
                title="Tải ảnh đại diện mới lên Cloudinary"
              >
                <Icon n="camera" s={13} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 22, margin: 0 }}>{user.fullName || user.username}</h2>
                <span className="pill level" style={{ fontSize: 12 }}>
                  <Icon n="shield" s={14} />
                  {user.role === 'ADMIN' ? 'Quản trị viên' : 'Học viên'}
                </span>
                {isVipActive ? (
                  <span className="sub-badge active-vip" style={{ fontSize: 12, padding: '3px 10px' }}>
                    <Icon n="gem" s={13} /> {subscription?.packageName || 'Thành viên VIP'}
                  </span>
                ) : (
                  <span className="sub-badge free" style={{ fontSize: 12, padding: '3px 10px' }}>
                    <Icon n="user" s={13} /> Gói Miễn Phí
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className="sub" style={{ fontSize: 14 }}>@{user.username}</span>
                <button
                  type="button"
                  onClick={copyUsername}
                  title="Sao chép tên người dùng"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedUser ? 'var(--green-dark)' : 'var(--muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: 2,
                  }}
                >
                  <Icon n={copiedUser ? 'check' : 'copy'} s={14} />
                  {copiedUser && <span style={{ fontSize: 12, marginLeft: 4, fontWeight: 700 }}>Đã chép!</span>}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ghost ${isEditingName ? 'on' : ''}`}
              style={{ minHeight: 42, padding: '0 16px', fontSize: 14 }}
              onClick={() => {
                setIsEditingName(!isEditingName);
                setProfileMsg(null);
              }}
            >
              <Icon n="edit" s={16} />
              {isEditingName ? 'Đóng chỉnh sửa' : 'Sửa hồ sơ'}
            </button>
          </div>
        </div>

        {/* Edit Profile Section */}
        {isEditingName && (
          <div
            style={{
              marginTop: 18,
              paddingTop: 18,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div className="field">
              <label>Họ và tên hiển thị</label>
              <input
                className="input"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Nhập họ và tên của bạn (từ 2 đến 150 ký tự)"
                maxLength={150}
              />
            </div>

            {/* Avatar Tab Selector & Config */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>
                  Ảnh đại diện & Giao diện
                </label>
                <div style={{ display: 'flex', gap: 6, background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
                  <button
                    type="button"
                    onClick={() => setAvatarTab('upload')}
                    style={{
                      border: 'none',
                      background: avatarTab === 'upload' ? '#fff' : 'transparent',
                      color: avatarTab === 'upload' ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '5px 12px',
                      borderRadius: 7,
                      cursor: 'pointer',
                      boxShadow: avatarTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon n="camera" s={13} /> Tải ảnh lên (Cloudinary)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarTab('color')}
                    style={{
                      border: 'none',
                      background: avatarTab === 'color' ? '#fff' : 'transparent',
                      color: avatarTab === 'color' ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '5px 12px',
                      borderRadius: 7,
                      cursor: 'pointer',
                      boxShadow: avatarTab === 'color' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon n="palette" s={13} /> Chọn màu sắc
                  </button>
                </div>
              </div>

              {avatarTab === 'upload' ? (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px dashed #CBD5E1',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '2px solid #fff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      }}
                    >
                      {isPhotoAvatar ? (
                        <img
                          src={user.avatarUrl}
                          alt="Avatar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Icon n="image" s={24} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                        {isPhotoAvatar ? 'Ảnh đại diện hiện tại (Cloudinary)' : 'Chưa có ảnh đại diện'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        Hỗ trợ JPG, PNG, WEBP, GIF tối đa 10MB • Tự động nhận diện khuôn mặt
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isPhotoAvatar && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={avatarUploading}
                        className="btn ghost"
                        style={{
                          minHeight: 36,
                          padding: '0 12px',
                          fontSize: 13,
                          color: 'var(--red)',
                          borderColor: '#FECDD3',
                        }}
                      >
                        <Icon n="trash" s={14} /> Xóa ảnh
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="btn"
                      style={{
                        minHeight: 36,
                        padding: '0 16px',
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {avatarUploading ? (
                        <>
                          <span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                          Đang tải lên...
                        </>
                      ) : (
                        <>
                          <Icon n="upload" s={14} />
                          {isPhotoAvatar ? 'Đổi ảnh khác' : 'Chọn ảnh tải lên'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                    Chọn màu sắc hiển thị chữ cái đầu tên người dùng:
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedAvatarColor(c.id)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: c.id,
                          border: selectedAvatarColor === c.id ? '3px solid #0A2540' : '2px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          transition: 'transform 0.15s',
                          transform: selectedAvatarColor === c.id ? 'scale(1.15)' : 'none',
                        }}
                        title={c.label}
                      >
                        {selectedAvatarColor === c.id && <Icon n="check" s={18} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                className="btn ghost"
                style={{ minHeight: 44, padding: '0 20px', fontSize: 15 }}
                onClick={() => {
                  setIsEditingName(false);
                  setFullNameInput(user.fullName || '');
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn"
                style={{ minHeight: 44, padding: '0 24px', fontSize: 15 }}
                disabled={profileBusy}
                onClick={handleSaveProfile}
              >
                {profileBusy ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}

        {profileMsg && (
          <div className={profileMsg.type === 'ok' ? 'ok' : 'error'} style={{ marginTop: 14 }}>
            {profileMsg.text}
          </div>
        )}
      </div>

      {/* Membership & Subscription Status Section */}
      <div className="profile-sub-section">
        {isVipActive ? (
          /* Active VIP Subscription Card */
          <div className="sub-card current-vip">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <span className="sub-badge active-vip">
                  <Icon n="gem" s={13} /> Gói Hội Viên Đang Kích Hoạt
                </span>
                <div className="sub-title">
                  <span>{subscription?.packageName || 'Gói Theo Tháng'}</span>
                  <span className="pill ok" style={{ fontSize: 12, fontWeight: 700 }}>Hoạt động</span>
                </div>
                <div className="sub" style={{ fontSize: 14, marginTop: 4 }}>
                  Tài khoản của bạn đang có toàn quyền truy cập không giới hạn mọi tính năng AI cao cấp.
                </div>
              </div>

              <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.75)', padding: '10px 16px', borderRadius: 12, border: '1px solid #E9D5FF' }}>
                <div style={{ fontSize: 12, color: '#6B21A8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Thời hạn còn lại
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#7C3AED', marginTop: 2 }}>
                  {subscription?.remainingDays ?? 0} ngày
                </div>
                {subscription?.endDate && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Hết hạn: <b>{new Date(subscription.endDate).toLocaleDateString('vi-VN')}</b>
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E9D5FF', margin: '16px 0 12px', paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Đặc quyền VIP đang áp dụng:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                <div className="sub-feat-item">
                  <span className="sub-feat-icon check">✓</span>
                  <span>Mở khóa toàn bộ 5/5 cấp độ CEFR (A1, A2, B1, B2, C1)</span>
                </div>
                <div className="sub-feat-item">
                  <span className="sub-feat-icon check">✓</span>
                  <span>Luyện tập Flashcards & AI Tutor phản xạ không giới hạn</span>
                </div>
                <div className="sub-feat-item">
                  <span className="sub-feat-icon check">✓</span>
                  <span>Giải thích cấu trúc ngữ cảnh chuyên sâu theo từng từ vựng</span>
                </div>
                <div className="sub-feat-item">
                  <span className="sub-feat-icon check">✓</span>
                  <span>Hỗ trợ phân tích ngữ điệu phát âm thông minh</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 14 }}
                onClick={() => nav('/landing#pricing')}
              >
                Xem chi tiết các gói
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
                  color: '#fff',
                  fontSize: 14,
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                }}
                disabled={initiatingUpgrade !== null}
                onClick={() => handleUpgrade(1)}
              >
                <Icon n="gem" s={16} />
                {initiatingUpgrade === 1 ? 'Đang kết nối PayOS...' : 'Gia hạn thêm gói (99.000đ / tháng)'}
              </button>
            </div>
          </div>
        ) : (
          /* Free Tier + Upgrade Recommendation Side By Side */
          <div>
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon n="gem" s={20} /> Gói dịch vụ & Gợi ý nâng cấp
              </h3>
              <p className="sub" style={{ margin: '4px 0 0', fontSize: 13.5 }}>
                Tài khoản của bạn hiện đang dùng gói Miễn phí. Nâng cấp ngay để mở khóa toàn diện kho từ vựng và AI Tutor!
              </p>
            </div>

            <div className="profile-sub-grid">
              {/* Thẻ 1: Gói hiện tại đang dùng (Miễn phí) */}
              <div className="sub-card current-free">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="sub-badge free">
                      <Icon n="check" s={13} /> Đang sử dụng
                    </span>
                    <span className="sub" style={{ fontSize: 13, fontWeight: 600 }}>Cơ bản</span>
                  </div>
                  <div className="sub-title">Gói Miễn Phí (Free)</div>
                  <div className="sub-price">
                    0 đ <small>/ Vĩnh viễn</small>
                  </div>
                  <div className="sub" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                    Phù hợp cho người mới bắt đầu làm quen với từ vựng tiếng Anh căn bản hàng ngày.
                  </div>

                  <ul className="sub-features">
                    <li className="sub-feat-item">
                      <span className="sub-feat-icon check">✓</span>
                      <span>Học từ vựng cấp độ A1 & A2 cơ bản</span>
                    </li>
                    <li className="sub-feat-item">
                      <span className="sub-feat-icon check">✓</span>
                      <span>Flashcards phản xạ ghi nhớ hàng ngày</span>
                    </li>
                    <li className="sub-feat-item off">
                      <span className="sub-feat-icon cross">✕</span>
                      <span>Khóa cấp độ trung & cao cấp (B1, B2, C1)</span>
                    </li>
                    <li className="sub-feat-item off">
                      <span className="sub-feat-icon cross">✕</span>
                      <span>Giới hạn tương tác trò chuyện với AI Tutor</span>
                    </li>
                    <li className="sub-feat-item off">
                      <span className="sub-feat-icon cross">✕</span>
                      <span>Không có phân tích ngữ cảnh từ vựng sâu</span>
                    </li>
                  </ul>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#F1F5F9',
                      color: '#64748B',
                      fontSize: 13.5,
                      fontWeight: 700,
                    }}
                  >
                    Gói mặc định của tài khoản
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Gợi ý nâng cấp kế bên (Gói Theo Tháng) */}
              <div className="sub-card upgrade-rec">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="sub-badge rec">
                      <Icon n="spark" s={13} /> Gợi ý nâng cấp
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#4F46E5', background: '#EEF2FF', padding: '3px 8px', borderRadius: 6 }}>
                      Phổ biến nhất
                    </span>
                  </div>
                  <div className="sub-title">
                    Gói Theo Tháng
                    <span style={{ color: '#F59E0B' }}>★</span>
                  </div>
                  <div className="sub-price">
                    99.000 đ <small>/ 30 ngày</small>
                  </div>
                  <div className="sub" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                    Mở khóa không giới hạn sức mạnh AI Tutor và trọn bộ 5 cấp độ CEFR (A1 - C1).
                  </div>

                  <ul className="sub-features">
                    <li className="sub-feat-item">
                      <span className="sub-feat-icon check">✓</span>
                      <span>Mở khóa toàn bộ cấp độ A1, A2, B1, B2, C1</span>
                    </li>
                    <li className="sub-feat-item">
                      <span className="sub-feat-icon check">✓</span>
                      <span>Trợ lý AI Tutor giải thích ngữ cảnh không giới hạn</span>
                    </li>
                    <li className="sub-feat-item">
                      <span className="sub-feat-icon check">✓</span>
                      <span>Bộ câu đố Quiz thích ứng và phản xạ nhanh</span>
                    </li>
                    <li className="sub-feat-item">
                      <span className="sub-feat-icon check">✓</span>
                      <span>Thanh toán tiện lợi, kích hoạt tức thì qua PayOS</span>
                    </li>
                  </ul>
                </div>

                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="sub-btn-upgrade"
                    disabled={initiatingUpgrade !== null}
                    onClick={() => handleUpgrade(1)}
                  >
                    <Icon n="gem" s={17} />
                    <span>
                      {initiatingUpgrade === 1 ? 'Đang kết nối PayOS...' : 'Nâng cấp ngay qua PayOS'}
                    </span>
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                    <Icon n="shield" s={13} />
                    <span>Bảo mật giao dịch QR PayOS Ngân Hàng 100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {upgradeNotice && (
          <div className="error" style={{ margin: '8px 0' }}>
            {upgradeNotice}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="seg" style={{ margin: '4px 0' }}>
        <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>
          <Icon n="user" s={18} /> Thông tin
        </button>
        <button className={tab === 'security' ? 'on' : ''} onClick={() => setTab('security')}>
          <Icon n="lock" s={18} /> Đổi mật khẩu
        </button>
        <button className={tab === 'preferences' ? 'on' : ''} onClick={() => setTab('preferences')}>
          <Icon n="target" s={18} /> Mục tiêu học
        </button>
        <button className={tab === 'statistics' ? 'on' : ''} onClick={() => setTab('statistics')}>
          <Icon n="chart" s={18} /> Thống kê
        </button>
      </div>

      {/* Tab 1: Account Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="user" s={20} /> Chi tiết tài khoản
            </h2>
            <div className="kv">
              <span>Họ và tên</span>
              <b>{user.fullName || 'Chưa cập nhật'}</b>
            </div>
            <div className="kv">
              <span>Tên đăng nhập</span>
              <b>@{user.username}</b>
            </div>
            <div className="kv">
              <span>Địa chỉ Email</span>
              <b>{user.email}</b>
            </div>
            <div className="kv">
              <span>Trạng thái tài khoản</span>
              <b>
                <span className="dot g" />
                {user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status}
              </b>
            </div>
            <div className="kv">
              <span>Gói thành viên</span>
              <b>
                {isVipActive ? (
                  <span style={{ color: '#7C3AED', fontWeight: 800 }}>
                    {subscription?.packageName || 'Gói Theo Tháng'} (Còn {subscription?.remainingDays ?? 0} ngày)
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Gói Miễn Phí (Free)</span>
                )}
              </b>
            </div>
            <div className="kv">
              <span>Vai trò</span>
              <b>{user.role === 'ADMIN' ? 'Quản trị viên hệ thống' : 'Học viên'}</b>
            </div>
            {user.createdAt && (
              <div className="kv">
                <span>Ngày tham gia</span>
                <b>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</b>
              </div>
            )}
          </div>

          {/* Quick learning status highlight */}
          <div className="cols2">
            <div className="card center">
              <div className="sub"><Icon n="book" s={18} /> Vốn từ đã học</div>
              <b style={{ fontSize: 30, color: 'var(--primary-dark)', marginTop: 4 }}>{totalLearned} từ</b>
            </div>
            <div className="card center">
              <div className="sub"><Icon n="spark" s={18} /> Tỉ lệ chính xác</div>
              <b style={{ fontSize: 30, color: 'var(--green-dark)', marginTop: 4 }}>{accuracy}%</b>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Change Password */}
      {tab === 'security' && (
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="lock" s={20} /> Đổi mật khẩu đăng nhập
            </h2>
            <div className="sub" style={{ marginTop: 4 }}>
              Để bảo vệ tài khoản, hãy sử dụng mật khẩu mạnh gồm chữ hoa, chữ thường và chữ số.
            </div>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Old Password */}
            <div className="field">
              <label>Mật khẩu hiện tại</label>
              <div className="input-with-icon">
                <input
                  className="input"
                  type={showOldPw ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu bạn đang dùng"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowOldPw(!showOldPw)}
                  title={showOldPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Icon n={showOldPw ? 'eyeOff' : 'eye'} s={18} />
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Mật khẩu mới</label>
                {newPassword && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: pwStrength.color }}>
                    Độ mạnh: {pwStrength.label}
                  </span>
                )}
              </div>
              <div className="input-with-icon">
                <input
                  className="input"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự, có chữ hoa, thường & số"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowNewPw(!showNewPw)}
                  title={showNewPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Icon n={showNewPw ? 'eyeOff' : 'eye'} s={18} />
                </button>
              </div>

              {/* Password Strength Meter Bar */}
              {newPassword && (
                <div style={{ height: 6, background: 'var(--line)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(pwStrength.score / 3) * 100}%`,
                      background: pwStrength.color,
                      transition: 'all 0.25s ease',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="field">
              <label>Xác nhận mật khẩu mới</label>
              <div className="input-with-icon">
                <input
                  className="input"
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại chính xác mật khẩu mới"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  title={showConfirmPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Icon n={showConfirmPw ? 'eyeOff' : 'eye'} s={18} />
                </button>
              </div>
            </div>

            {/* Realtime Checklist */}
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 8,
                padding: '14px 16px',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--ink)', marginBottom: 8 }}>
                Yêu cầu tiêu chuẩn bảo mật:
              </div>
              <div className="criteria-list">
                <div className={`criteria-item ${hasMinLength ? 'ok' : ''}`}>
                  <Icon n={hasMinLength ? 'check' : 'x'} s={16} />
                  <span>Độ dài từ 8 ký tự trở lên</span>
                </div>
                <div className={`criteria-item ${hasUpper ? 'ok' : ''}`}>
                  <Icon n={hasUpper ? 'check' : 'x'} s={16} />
                  <span>Ít nhất 1 chữ in hoa (A-Z)</span>
                </div>
                <div className={`criteria-item ${hasLower ? 'ok' : ''}`}>
                  <Icon n={hasLower ? 'check' : 'x'} s={16} />
                  <span>Ít nhất 1 chữ thường (a-z)</span>
                </div>
                <div className={`criteria-item ${hasNumber ? 'ok' : ''}`}>
                  <Icon n={hasNumber ? 'check' : 'x'} s={16} />
                  <span>Ít nhất 1 chữ số (0-9)</span>
                </div>
                <div className={`criteria-item ${isMatch ? 'ok' : ''}`}>
                  <Icon n={isMatch ? 'check' : 'x'} s={16} />
                  <span>Xác nhận mật khẩu trùng khớp</span>
                </div>
              </div>
            </div>

            {pwMsg && (
              <div className={pwMsg.type === 'ok' ? 'ok' : 'error'}>
                {pwMsg.text}
              </div>
            )}

            <button
              type="submit"
              className="btn block"
              disabled={pwBusy || !isPwFormValid}
              style={{ marginTop: 8 }}
            >
              <Icon n="lock" s={20} />
              {pwBusy ? 'Đang cập nhật mật khẩu...' : 'Cập nhật mật khẩu mới'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Learning Goals & Preferences */}
      {tab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Daily Goal Selection */}
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="target" s={20} /> Mục tiêu học từ vựng mỗi ngày
            </h2>
            <div className="sub" style={{ marginBottom: 16 }}>
              Chọn mục tiêu số lượng từ vựng bạn muốn chinh phục mỗi ngày cùng hệ thống:
            </div>

            <div className="goal-grid">
              {[
                { count: 10, title: 'Nhẹ nhàng', desc: '5 - 10 phút/ngày', badge: 'Thói quen' },
                { count: 20, title: 'Tiêu chuẩn', desc: '15 - 20 phút/ngày', badge: 'Khuyên dùng' },
                { count: 30, title: 'Bứt phá', desc: '25 - 30 phút/ngày', badge: 'Tốc độ' },
                { count: 50, title: 'Siêu tốc', desc: '45+ phút/ngày', badge: 'Chuyên sâu' },
              ].map((g) => {
                const isSelected = prefs.dailyGoal === g.count;
                return (
                  <div
                    key={g.count}
                    className={`goal-card ${isSelected ? 'on' : ''}`}
                    onClick={() => handleSavePreferences({ ...prefs, dailyGoal: g.count })}
                  >
                    <div className="pill" style={{ fontSize: 11, padding: '2px 8px', marginBottom: 8 }}>
                      {g.badge}
                    </div>
                    <div className="num">{g.count} từ</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginTop: 4 }}>
                      {g.title}
                    </div>
                    <div className="desc">{g.desc}</div>
                    {isSelected && (
                      <div style={{ color: 'var(--primary)', marginTop: 8 }}>
                        <Icon n="check" s={18} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CEFR Target Level */}
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="spark" s={20} /> Trình độ CEFR mục tiêu
            </h2>
            <div className="sub" style={{ marginBottom: 14 }}>
              Hệ thống AI sẽ tự động ưu tiên các từ vựng và bài tập theo cấp độ mục tiêu của bạn:
            </div>

            <div className="chips">
              {[
                { code: 'A1', name: 'A1 - Nhập môn (Beginner)' },
                { code: 'A2', name: 'A2 - Sơ cấp (Elementary)' },
                { code: 'B1', name: 'B1 - Trung cấp (Intermediate)' },
                { code: 'B2', name: 'B2 - Trung cao cấp (Upper)' },
                { code: 'C1', name: 'C1 - Cao cấp (Advanced)' },
              ].map((lvl) => (
                <button
                  key={lvl.code}
                  type="button"
                  className={`chip ${prefs.targetLevel === lvl.code ? 'on' : ''}`}
                  onClick={() => handleSavePreferences({ ...prefs, targetLevel: lvl.code })}
                >
                  <Icon n={prefs.targetLevel === lvl.code ? 'check' : 'gem'} s={16} />
                  {lvl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Preferences */}
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="settings" s={20} /> Tùy chọn trải nghiệm
            </h2>

            <div className="switch-row">
              <div>
                <b style={{ display: 'block', fontSize: 15 }}>Tự động phát âm thanh khi học</b>
                <span className="sub" style={{ fontSize: 13 }}>Tự phát âm bản xứ chuẩn khi lật thẻ từ vựng mới</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={prefs.autoPlayAudio}
                  onChange={(e) => handleSavePreferences({ ...prefs, autoPlayAudio: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="switch-row">
              <div>
                <b style={{ display: 'block', fontSize: 15 }}>Nhắc nhở học tập hàng ngày</b>
                <span className="sub" style={{ fontSize: 13 }}>Nhận thông báo giữ streak và duy trì nhịp độ học</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={prefs.dailyReminder}
                  onChange={(e) => handleSavePreferences({ ...prefs, dailyReminder: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="switch-row">
              <div>
                <b style={{ display: 'block', fontSize: 15 }}>Trợ lý AI Vi tương tác & mẹo ghi nhớ</b>
                <span className="sub" style={{ fontSize: 13 }}>Hiển thị gợi ý ngữ cảnh và hướng dẫn phát âm từ Vi</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={prefs.aiCoachHints}
                  onChange={(e) => handleSavePreferences({ ...prefs, aiCoachHints: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>

            {prefsSavedMsg && (
              <div className="ok" style={{ marginTop: 12 }}>
                Đã lưu cài đặt tùy chọn thành công!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Detailed Statistics & Achievements */}
      {tab === 'statistics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="kpi-row">
            <div className="kpi">
              <div className="lbl">Tổng từ vựng</div>
              <div className="num" style={{ color: 'var(--primary-dark)' }}>{totalLearned}</div>
              <div className="delta up"><span className="dot g" />Đang tích lũy</div>
            </div>
            <div className="kpi">
              <div className="lbl">Thành thạo</div>
              <div className="num" style={{ color: 'var(--green-dark)' }}>{masteredCount}</div>
              <div className="delta up">Tỉ lệ {masteredPercent}%</div>
            </div>
            <div className="kpi">
              <div className="lbl">Đang học</div>
              <div className="num" style={{ color: 'var(--yellow-dark)' }}>{learningCount}</div>
              <div className="delta">Cần rèn luyện</div>
            </div>
            <div className="kpi">
              <div className="lbl">Cần ôn tập</div>
              <div className="num" style={{ color: 'var(--red-dark)' }}>{reviewCount}</div>
              <div className="delta down">Khoảng giãn cách</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Phân bổ độ thành thạo</h2>
            <div className="bar-row" style={{ marginBottom: 10 }}>
              <span className="lbl">Thành thạo:</span>
              <div className="progress green">
                <i style={{ width: `${masteredPercent}%` }} />
              </div>
              <b>{masteredPercent}%</b>
            </div>
            <div className="bar-row">
              <span className="lbl">Chính xác:</span>
              <div className="progress">
                <i style={{ width: `${accuracy}%` }} />
              </div>
              <b>{accuracy}%</b>
            </div>
          </div>

          <div className="card">
            <div className="coach">
              <Mascot s={48} />
              <div className="bubble">
                <b>Lời khuyên từ Vi:</b> Bạn đang có tiến độ rất tuyệt vời! Để đạt mục tiêu{' '}
                <span style={{ color: 'var(--primary-dark)', fontWeight: 900 }}>{prefs.dailyGoal} từ/ngày</span>, hãy ghé thăm mục{' '}
                <button
                  type="button"
                  className="link"
                  onClick={() => nav('/review')}
                  style={{ textDecoration: 'underline', padding: 0 }}
                >
                  Ôn tập
                </button>{' '}
                và{' '}
                <button
                  type="button"
                  className="link"
                  onClick={() => nav('/speaking')}
                  style={{ textDecoration: 'underline', padding: 0 }}
                >
                  Luyện nói AI
                </button>{' '}
                để củng cố phản xạ tự nhiên nhé!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mascot Motivation Box for other tabs */}
      {tab !== 'statistics' && (
        <div className="card">
          <div className="coach">
            <Mascot s={44} />
            <div className="bubble">
              <b>Vi:</b> Đặt mục tiêu học mỗi ngày là bí quyết tốt nhất để tăng vốn từ vựng và tự tin giao tiếp!
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions & Logout */}
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn ghost" onClick={() => nav('/favorites')}>
          <Icon n="heart" s={20} /> Từ yêu thích
        </button>
        <button
          className="btn danger-ghost"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <Icon n="logout" s={20} /> Đăng xuất
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 37, 64, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 420,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              textAlign: 'center',
            }}
          >
            <Mascot s={56} />
            <h2 style={{ marginTop: 12 }}>Bạn muốn đăng xuất?</h2>
            <div className="sub" style={{ marginTop: 6, marginBottom: 20 }}>
              Tiến độ học hôm nay của bạn đã được lưu an toàn trên hệ thống. Hẹn gặp lại bạn sớm!
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn ghost"
                style={{ flex: 1 }}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Ở lại học
              </button>
              <button
                className="btn danger-ghost"
                style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none' }}
                onClick={logout}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
