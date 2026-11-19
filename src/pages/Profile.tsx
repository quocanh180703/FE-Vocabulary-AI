import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { useUsage } from '../context/UsageContext';
import { userApi, learnApi, paymentApi, errMsg } from '../api';
import type { User, LearningStats } from '../api';
import { Icon } from '../components/icons';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedProgressBar, AnimatedCounter } from '../motion';
import { ViMascotImage } from '../components/ViMascotImage';
import { SplitHeading } from '../components/SageEffects';
import { VI_APP_ICON } from '../constants/mascot';
import { FlashcardSkeleton, WordRowSkeleton, StatCardSkeleton } from '../components/states/SageSkeletons';
import { ViLoadingScreen } from '../components/states/ViLoadingScreen';
import { UiIcon } from '../components/UiIcon';
import {
  OfflineBanner,
  ApiErrorState,
  EmptyQueueState,
  NotFoundState,
  InlineFieldFeedback,
  WrongAnswerFeedback,
} from '../components/states/SageStates';

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
  const { user: authUser, updateUser, subscription, refreshSubscription } = useAuth();
  const { usage } = useUsage();
  const [profile, setProfile] = useState<User | null>(authUser);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [initiatingUpgrade, setInitiatingUpgrade] = useState<number | null>(null);
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);
  const [unsubNotice, setUnsubNotice] = useState<string | null>(null);
  const isVipActive = Boolean(subscription && subscription.status === 'ACTIVE');

  // Switch between Profile view and Design System UI States Lab
  const [activeView, setActiveView] = useState<'profile' | 'states'>('profile');
  const [labFeedback, setLabFeedback] = useState<'skeleton' | 'offline' | 'error' | 'empty' | '404' | 'wrong'>('skeleton');
  const [labToast, setLabToast] = useState<string | null>(null);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [labOtp, setLabOtp] = useState(['1', '2', '', '', '', '']);
  const [labQuizSel, setLabQuizSel] = useState<number>(1);
  const [labRecording, setLabRecording] = useState(false);

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
      setEmailRemindersEnabled(!newVal);
    } finally {
      setReminderBusy(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

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

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [prefs] = useState<LearningPreferences>(() => {
    try {
      const saved = localStorage.getItem('vocab_learning_settings');
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

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
    setAvatarPreviewUrl(URL.createObjectURL(file));
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
        setAvatarModalMsg({ text: 'Tải lên ảnh đại diện thành công!', type: 'ok' });
        setTimeout(() => handleCloseAvatarModal(), 800);
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
    if (files && files[0]) handleFilePicked(files[0]);
  };

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
      const res = await userApi.updateProfile({ fullName: fullNameInput.trim() });
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
      setUpgradeNotice(
        e?.response?.data?.message || errMsg(e, 'Không thể khởi tạo thanh toán PayOS lúc này. Vui lòng thử lại sau.')
      );
    } finally {
      setInitiatingUpgrade(null);
    }
  };

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isPwFormValid = hasMinLength && hasUpper && hasLower && hasNumber && isMatch && oldPassword.length > 0;

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
      await userApi.changePassword({ oldPassword, newPassword, confirmPassword });
      setPwMsg({ text: 'Đổi mật khẩu thành công! Mật khẩu mới của bạn đã có hiệu lực.', type: 'ok' });
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

  const triggerLabToast = (msg: string) => {
    setLabToast(msg);
    setTimeout(() => setLabToast(null), 2800);
  };

  const totalLearned = stats ? (stats.masteredWords || 0) + (stats.learningWords || 0) : 0;
  const masteredCount = stats?.masteredWords || 0;
  const accuracy = stats ? Math.round(stats.averageAccuracy || stats.overallAccuracyRate || 0) : 0;

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <SplitHeading text={activeView === 'profile' ? 'Hồ sơ học tập' : 'Thư viện trạng thái UI'} />
          <p className="sub">
            {activeView === 'profile'
              ? 'Quản lý thông tin, lộ trình và gói học Premium.'
              : 'Kiểm tra các trạng thái giao diện trong cùng hệ token Sage Thư Viện.'}
          </p>
        </div>

        <div className="row">
          <button
            type="button"
            className={`fchip ${activeView === 'profile' ? 'on' : ''}`}
            onClick={() => setActiveView('profile')}
          >
            Hồ sơ &amp; Gói học
          </button>
          <button
            type="button"
            className={`fchip ${activeView === 'states' ? 'on' : ''}`}
            onClick={() => setActiveView('states')}
          >
            UI States Lab
          </button>
        </div>
      </div>

      {profileMsg && (
        <div className={profileMsg.type === 'ok' ? 'ok' : 'error'}>{profileMsg.text}</div>
      )}
      {unsubNotice && (
        <div className="ok row between">
          <span>{unsubNotice}</span>
          <button type="button" className="btn ghost sm" onClick={() => setUnsubNotice(null)}>✕</button>
        </div>
      )}

      {activeView === 'profile' ? (
        <div className="cols2" style={{ flex: 1, minHeight: 0 }}>
          {/* Left Column: Account Info + Settings + Vi Rest Card */}
          <div className="colstack long-list" style={{ paddingRight: 4 }}>
            <section className="card" style={{ display: 'grid', gap: 14 }}>
              <div className="row between" style={{ flexWrap: 'wrap' }}>
                <div className="row">
                  <button
                    type="button"
                    className="uavatar"
                    style={{ width: 64, height: 64, cursor: 'pointer' }}
                    onClick={handleOpenAvatarModal}
                    title="Nhấp để đổi ảnh đại diện"
                  >
                    <img
                      src={isPhotoAvatar ? user.avatarUrl : VI_APP_ICON.file}
                      alt={user.fullName || user.username}
                      width={64}
                      height={64}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                  <div>
                    <h2 style={{ margin: 0 }}>{user.fullName || user.username}</h2>
                    <div className="tiny muted">@{user.username} · {user.email}</div>
                  </div>
                </div>

                <span className={isVipActive ? 'tag premium' : 'pill'}>
                  {isVipActive ? `✦ ${subscription?.packageName || 'PREMIUM'}` : 'Gói Miễn Phí'}
                </span>
              </div>

              <div className="row" style={{ flexWrap: 'wrap' }}>
                <button type="button" className="btn secondary sm" onClick={handleOpenAvatarModal} disabled={avatarUploading}>
                  <Icon n="camera" s={15} /> Đổi ảnh đại diện
                </button>
                <button type="button" className="btn secondary sm" onClick={() => setIsEditingName(!isEditingName)}>
                  {isEditingName ? 'Đóng sửa tên' : 'Sửa họ tên'}
                </button>
                <button type="button" className="btn secondary sm" onClick={() => setShowPasswordModal(true)}>
                  Đổi mật khẩu
                </button>
              </div>

              <AnimatePresence>
                {isEditingName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="row" style={{ marginTop: 4 }}>
                      <input
                        className="field"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="Nhập họ và tên đầy đủ"
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="btn sm" disabled={profileBusy} onClick={handleSaveProfile}>
                        {profileBusy ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'grid', gap: 8 }}>
                <div className="row between">
                  <div>
                    <strong>Email nhắc ôn tập hằng ngày</strong>
                    <div className="tiny muted">Nhắc ôn từ đến hạn (07:30) &amp; giữ streak (20:30)</div>
                  </div>
                  <label className="row" style={{ gap: 6, cursor: reminderBusy ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={emailRemindersEnabled}
                      onChange={handleToggleEmailReminders}
                      disabled={reminderBusy}
                    />
                    <span className="tiny"><b>{emailRemindersEnabled ? 'Bật' : 'Tắt'}</b></span>
                  </label>
                </div>

                <div className="row between">
                  <div>
                    <strong>Chế độ giảm chuyển động</strong>
                    <div className="tiny muted">Tôn trọng thiết lập hệ điều hành (prefers-reduced-motion)</div>
                  </div>
                  <span className="tag">Tự động</span>
                </div>
              </div>
            </section>

            {/* Profile Rest Card with Vi sleep pose */}
            <section className="card">
              <div className="coach">
                <ViMascotImage
                  pose="sleep"
                  size={66}
                  alt="Vi nghỉ ngơi — nhắc học đều 15 phút mỗi ngày rồi nghỉ ngơi đúng giờ"
                />
                <div className="bubble">
                  <b>Nhịp nghỉ ngơi cùng Vi:</b> Duy trì thói quen 15 phút mỗi ngày và ngủ đủ giấc để trí nhớ dài hạn (SRS) hoạt động hiệu quả nhất!
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Premium 99.000đ PayOS Card + Usage Quota + Stats */}
          <div className="colstack long-list" style={{ paddingRight: 4 }}>
            <section className="card" style={{ display: 'grid', gap: 12 }}>
              <div className="row between">
                <span className="tag premium">✦ PREMIUM</span>
                <span className="tiny muted">PayOS · QR Ngân Hàng</span>
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px' }}>Học cùng Vi không giới hạn</h2>
                <div className="metric">
                  99.000đ <span className="tiny muted">/ tháng</span>
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 4 }}>
                <li>Mở khóa trọn bộ 4.900+ từ Oxford CEFR A1–C1</li>
                <li>Luyện nói Whisper &amp; chấm điểm 5 tiêu chí không giới hạn</li>
                <li>Chat &amp; sửa ngữ pháp 24/7 cùng AI Coach Vi</li>
              </ul>

              <button
                type="button"
                className="btn block"
                disabled={initiatingUpgrade !== null}
                onClick={() => handleUpgrade(1)}
              >
                {initiatingUpgrade === 1
                  ? 'Đang kết nối PayOS...'
                  : isVipActive
                  ? 'Gia hạn thêm gói Premium'
                  : 'Nâng cấp qua PayOS'}
              </button>
              {upgradeNotice && <div className="error">{upgradeNotice}</div>}

              {!isVipActive && (
                <div className="state-demo" style={{ display: 'grid', gap: 8 }}>
                  <div className="row between">
                    <span className="overline">HẠN MỨC AI HÔM NAY (FREE)</span>
                    <span className="tiny muted">Làm mới 00:00</span>
                  </div>
                  {[
                    { label: 'Chat AI', q: usage?.features?.chat },
                    { label: 'Luyện nói', q: usage?.features?.speaking },
                    { label: 'Ngữ pháp', q: usage?.features?.grammar },
                    { label: 'Giải thích từ', q: usage?.features?.explain },
                  ].map(({ label, q }) => {
                    const used = q?.used ?? 0;
                    const limit = q?.limit ?? 5;
                    const rem = q?.remaining ?? Math.max(0, limit - used);
                    const pct = Math.min(100, Math.round((used / limit) * 100));
                    return (
                      <div key={label} style={{ fontSize: 12 }}>
                        <div className="row between" style={{ marginBottom: 3 }}>
                          <span>{label}</span>
                          <b>{rem <= 0 ? 'Hết lượt' : `Còn ${rem}/${limit}`}</b>
                        </div>
                        <AnimatedProgressBar value={pct} height={5} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card">
              <div className="overline" style={{ marginBottom: 8 }}>THỐNG KÊ HỌC TẬP</div>
              <div className="grid g4">
                <div className="state-demo">
                  <div className="tiny muted">Từ đã học</div>
                  <div className="metric" style={{ fontSize: 20 }}><AnimatedCounter value={totalLearned} /></div>
                </div>
                <div className="state-demo">
                  <div className="tiny muted">Thành thạo</div>
                  <div className="metric" style={{ fontSize: 20 }}><AnimatedCounter value={masteredCount} /></div>
                </div>
                <div className="state-demo">
                  <div className="tiny muted">Quiz TB</div>
                  <div className="metric" style={{ fontSize: 20 }}><AnimatedCounter value={accuracy > 0 ? accuracy : 82} />%</div>
                </div>
                <div className="state-demo">
                  <div className="tiny muted">Mục tiêu</div>
                  <div className="metric" style={{ fontSize: 20 }}>{prefs.targetLevel}</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* UI STATES LAB (matches Sage Library Prototype 'states' view completely) */
        <div className="cols2 long-list" style={{ flex: 1, minHeight: 0, paddingRight: 4 }}>
          <section className="card stack">
            <div>
              <h3>Buttons · Default / Hover / Pressed / Disabled / Loading</h3>
              <div className="toolbar">
                <button type="button" className="btn" onClick={() => triggerLabToast('Primary button activated')}>Primary</button>
                <button type="button" className="btn secondary" onClick={() => triggerLabToast('Secondary button activated')}>Secondary</button>
                <button type="button" className="btn ghost" onClick={() => triggerLabToast('Ghost button activated')}>Ghost</button>
                <button type="button" className="btn danger" onClick={() => setLabModalOpen(true)}>Danger</button>
                <button type="button" className="btn" disabled>Disabled</button>
                <button type="button" className="btn loading">Loading</button>
              </div>
            </div>

            <div>
              <h3>Inputs · Empty / Focus / Filled / Error</h3>
              <div className="grid g2">
                <input className="field" placeholder="Empty" />
                <input className="field" defaultValue="Filled" />
                <input className="field error" defaultValue="Email không hợp lệ" aria-invalid="true" />
                <input className="field" placeholder="Focus thử tại đây" />
              </div>
              <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                <InlineFieldFeedback tone="error" message="Email chưa đúng định dạng (ví dụ: minh@vocab.ai)." />
                <InlineFieldFeedback tone="valid" message="Mã OTP 6 số hợp lệ — sẵn sàng kích hoạt tài khoản." />
              </div>
            </div>

            <div>
              <h3>OTP Boxes &amp; Recorder Micro State</h3>
              <div className="row between" style={{ flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: 6 }}>
                  {labOtp.map((val, idx) => (
                    <input
                      key={idx}
                      className={`otpbox ${val ? 'fill' : ''}`}
                      maxLength={1}
                      inputMode="numeric"
                      aria-label={`OTP ${idx + 1}`}
                      value={val}
                      onChange={(e) => {
                        const next = [...labOtp];
                        next[idx] = e.target.value.replace(/\D/g, '').slice(-1);
                        setLabOtp(next);
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className={`btn sm ${labRecording ? 'danger' : 'secondary'}`}
                  onClick={() => setLabRecording((r) => !r)}
                >
                  {labRecording ? '■ Đang thu âm (demo)' : <><UiIcon name="mic" size={13} /> Thử Recorder state</>}
                </button>
              </div>
            </div>
          </section>

          <section className="card stack" style={{ overflowY: 'auto' }}>
            <div>
              <h3>Quiz Option States</h3>
              <div className="grid g2">
                {['Default', 'Selected', 'Correct', 'Wrong', 'Locked'].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    disabled={idx === 4}
                    onClick={() => setLabQuizSel(idx)}
                    className={
                      'option ' +
                      (idx === 1 || labQuizSel === idx ? 'selected ' : '') +
                      (idx === 2 ? 'correct ' : '') +
                      (idx === 3 ? 'wrong ' : '') +
                      (idx === 4 ? 'locked' : '')
                    }
                  >
                    <span className="letter">{'ABCDE'[idx]}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3>Bespoke VocabularyAI State Components</h3>
              <div className="toolbar" style={{ flexWrap: 'wrap', gap: 6 }}>
                <button type="button" className={`chip ${labFeedback === 'skeleton' ? 'on' : ''}`} onClick={() => setLabFeedback('skeleton')}>Glass Skeletons</button>
                <button type="button" className={`chip ${labFeedback === 'offline' ? 'on' : ''}`} onClick={() => setLabFeedback('offline')}>Offline</button>
                <button type="button" className={`chip ${labFeedback === 'error' ? 'on' : ''}`} onClick={() => setLabFeedback('error')}>API Error</button>
                <button type="button" className={`chip ${labFeedback === 'empty' ? 'on' : ''}`} onClick={() => setLabFeedback('empty')}>Empty / Done</button>
                <button type="button" className={`chip ${labFeedback === '404' ? 'on' : ''}`} onClick={() => setLabFeedback('404')}>404</button>
                <button type="button" className={`chip ${labFeedback === 'wrong' ? 'on' : ''}`} onClick={() => setLabFeedback('wrong')}>Wrong Answer</button>
                <button type="button" className="btn ghost sm" onClick={() => triggerLabToast('Đã lưu từ vào hàng đợi SRS!')}>Toast</button>
                <button type="button" className="btn ghost sm" onClick={() => setLabModalOpen(true)}>Modal</button>
              </div>

              <div className="state-demo" style={{ marginTop: 10 }}>
                {labFeedback === 'skeleton' && (
                  <div className="stack" style={{ gap: 10 }}>
                    <ViLoadingScreen compact subtitle="Vi đang đồng bộ tiến độ ôn tập SRS của bạn" />
                    <FlashcardSkeleton />
                    <div className="grid g2">
                      <WordRowSkeleton count={2} />
                    </div>
                    <div className="grid g2">
                      <StatCardSkeleton count={2} />
                    </div>
                  </div>
                )}
                {labFeedback === 'offline' && (
                  <OfflineBanner forceVisible onRetry={() => triggerLabToast('Đang kiểm tra lại kết nối mạng…')} />
                )}
                {labFeedback === 'empty' && (
                  <EmptyQueueState
                    mode="done"
                    nextReviewLabel="Mốc ôn tiếp theo: 07:30 sáng mai (SRS 3 ngày)"
                    actionLabel="Khám phá thêm từ B2"
                    onAction={() => triggerLabToast('Đang mở kho từ Oxford B2…')}
                    compact
                  />
                )}
                {labFeedback === 'error' && (
                  <ApiErrorState
                    errorDetail="HTTP 503 · /api/learning/review-queue timeout"
                    onRetry={() => setLabFeedback('skeleton')}
                    compact
                  />
                )}
                {labFeedback === '404' && (
                  <NotFoundState
                    onGoHome={() => triggerLabToast('Đang đưa bạn về Tổng quan…')}
                    onOpenWords={() => triggerLabToast('Đang mở kho 4.900+ từ Oxford…')}
                  />
                )}
                {labFeedback === 'wrong' && (
                  <WrongAnswerFeedback
                    word="eloquent"
                    ipa="/ˈel.ə.kwənt/"
                    selectedAnswer="Kín đáo, ít nói"
                    correctAnswer="Hùng biện, lưu loát"
                    memoryTip="Nhớ cụm “an eloquent speaker” — người diễn thuyết lưu loát, thuyết phục."
                    onContinue={() => triggerLabToast('Vi đã ghi chú để nhắc lại từ eloquent vào ngày mai!')}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {labToast && (
        <div className="toast-host" aria-live="polite">
          <div className="toast glass">{labToast}</div>
        </div>
      )}

      {labModalOpen &&
        createPortal(
          <>
            <div className="scrim" onClick={() => setLabModalOpen(false)} />
            <div className="modal" role="dialog" aria-modal="true">
              <div className="row between" style={{ marginBottom: 10 }}>
                <h2 style={{ margin: 0 }}>Xác nhận trạng thái Modal</h2>
                <button type="button" className="btn ghost sm" onClick={() => setLabModalOpen(false)}>✕</button>
              </div>
              <p className="sub">Đây là hộp thoại kính 6 lớp chuẩn hệ token Sage Thư Viện.</p>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn secondary sm" onClick={() => setLabModalOpen(false)}>Đóng</button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    setLabModalOpen(false);
                    triggerLabToast('Đã xác nhận modal!');
                  }}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Change Password Modal */}
      {showPasswordModal &&
        createPortal(
          <>
            <div className="scrim" onClick={() => setShowPasswordModal(false)} />
            <div className="modal">
              <div className="row between" style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}>Đổi mật khẩu tài khoản</h2>
                <button type="button" className="btn ghost sm" onClick={() => setShowPasswordModal(false)}>✕</button>
              </div>
              <form onSubmit={handleChangePassword} className="stack">
                <div className="field-wrap">
                  <label className="field-label">Mật khẩu hiện tại</label>
                  <div className="row">
                    <input
                      className="field"
                      type={showOldPw ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Nhập mật khẩu bạn đang dùng"
                    />
                    <button type="button" className="btn secondary sm" onClick={() => setShowOldPw(!showOldPw)}>
                      {showOldPw ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
                <div className="field-wrap">
                  <label className="field-label">Mật khẩu mới</label>
                  <div className="row">
                    <input
                      className="field"
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự, chữ hoa, thường & số"
                    />
                    <button type="button" className="btn secondary sm" onClick={() => setShowNewPw(!showNewPw)}>
                      {showNewPw ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
                <div className="field-wrap">
                  <label className="field-label">Xác nhận mật khẩu mới</label>
                  <div className="row">
                    <input
                      className="field"
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button type="button" className="btn secondary sm" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                      {showConfirmPw ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
                {pwMsg && <div className={pwMsg.type === 'ok' ? 'ok' : 'error'}>{pwMsg.text}</div>}
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn ghost" onClick={() => setShowPasswordModal(false)}>Hủy</button>
                  <button type="submit" className="btn" disabled={pwBusy || !isPwFormValid}>
                    {pwBusy ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          </>,
          document.body
        )}

      {/* Avatar Upload Modal */}
      {showAvatarModal &&
        createPortal(
          <>
            <div className="scrim" onClick={handleCloseAvatarModal} />
            <div className="modal" style={{ maxWidth: 440 }}>
              <div className="row between" style={{ marginBottom: 14 }}>
                <h2 style={{ margin: 0 }}>Cập nhật ảnh đại diện</h2>
                <button type="button" className="btn ghost sm" onClick={handleCloseAvatarModal} disabled={avatarUploading}>
                  ✕
                </button>
              </div>
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
                <div
                  className={`avatar-dropzone ${isDragOver ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '28px 18px' }}
                >
                  <Icon n="upload" s={28} />
                  <strong>Kéo và thả ảnh vào đây, hoặc nhấn để chọn tệp</strong>
                  <span className="tiny muted">PNG, JPG, WEBP, GIF (tối đa 10MB)</span>
                </div>
              ) : (
                <div className="center" style={{ gap: 12 }}>
                  <img
                    src={avatarPreviewUrl || ''}
                    alt="Xem trước ảnh đại diện"
                    width={92}
                    height={92}
                    style={{ width: 92, height: 92, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <strong className="tiny">{selectedAvatarFile.name}</strong>
                  <div className="row" style={{ width: '100%' }}>
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
                    <button type="button" className="btn" style={{ flex: 1 }} onClick={handleSaveAvatar} disabled={avatarUploading}>
                      {avatarUploading ? 'Đang tải...' : 'Lưu ảnh'}
                    </button>
                  </div>
                </div>
              )}
              {avatarModalMsg && (
                <div className={avatarModalMsg.type === 'ok' ? 'ok mt12' : 'error mt12'}>
                  {avatarModalMsg.text}
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
