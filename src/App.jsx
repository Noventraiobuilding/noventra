import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [vips, setVips] = useState([]);
  const [missions, setMissions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [selectedVip, setSelectedVip] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCard, setWithdrawCard] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id);
    });

    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: vipData } = await supabase.from('vip_packages').select('*');
    const { data: missionData } = await supabase.from('missions').select('*');
    const { data: settingsData } = await supabase.from('system_settings').select('*').single();

    setVips(vipData || []);
    setMissions(missionData || []);
    setSettings(settingsData);
  };

  const loadUserData = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!selectedVip || !receiptFile) {
      return alert('Zəhmət olmasa VIP paket seçin və ödəniş qəbzini yükləyin!');
    }

    setLoading(true);
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile);

    if (uploadErr) {
      setLoading(false);
      return alert('Qəbz yüklənərkən xəta baş verdi: ' + uploadErr.message);
    }

    const receiptUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;

    const { error } = await supabase.from('investments').insert({
      user_id: user.id,
      vip_id: selectedVip.id,
      amount: selectedVip.price,
      receipt_url: receiptUrl,
      payment_method: 'Bank Kartı'
    });

    setLoading(false);
    if (error) {
      alert('Sorğu göndərilərkən xəta baş verdi.');
    } else {
      alert('Depozit sorğusu təqdim edildi! Admin təsdiqlədikdən sonra VIP aktivləşəcək.');
      setReceiptFile(null);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawCard) return alert('Məbləğ və kart nömrəsini qeyd edin!');

    setLoading(true);
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_amount: parseFloat(withdrawAmount),
      p_method: 'Bank Kartı',
      p_account_info: withdrawCard
    });

    setLoading(false);
    if (error || !data.success) {
      alert(data?.message || 'Çıxarış zamanı xəta baş verdi.');
    } else {
      alert(data.message);
      setWithdrawAmount('');
      setWithdrawCard('');
      loadUserData(user.id);
    }
  };

  const handleCompleteMission = async (missionId) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('complete_mission', {
      p_mission_id: missionId
    });

    setLoading(false);
    if (error || !data.success) {
      alert(data?.message || 'Xəta baş verdi.');
    } else {
      alert(`Təbriklər! ${data.reward} AZN balansınıza əlavə olundu.`);
      loadUserData(user.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-12">
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Invest & Earn Platform</h1>
        {profile && <span className="text-sm font-medium">Salam, {profile.full_name || profile.email}</span>}
      </header>

      <div className="max-w-4xl mx-auto mt-6 px-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-gray-500 text-sm">Ümumi Balans</p>
            <h2 className="text-2xl font-bold text-blue-600">{profile?.balance || '0.00'} AZN</h2>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl">
            <p className="text-gray-500 text-sm">Dondurulmuş Balans</p>
            <h2 className="text-2xl font-bold text-amber-600">{profile?.frozen_balance || '0.00'} AZN</h2>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-gray-500 text-sm">Cari VIP Status</p>
            <h2 className="text-2xl font-bold text-purple-600">{profile?.current_vip || 'Pulsuz'}</h2>
          </div>
        </div>

        <div className="flex space-x-2 border-b mb-6 overflow-x-auto pb-2">
          {['dashboard', 'deposit', 'withdraw', 'missions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'dashboard' && '👑 VIP Paketlər'}
              {tab === 'deposit' && '💳 Depozit'}
              {tab === 'withdraw' && '💸 Pul Çıxar'}
              {tab === 'missions' && '🎯 Missiyalar'}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vips.map((vip) => (
              <div key={vip.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-blue-600 mb-1">{vip.name}</h3>
                  <p className="text-2xl font-extrabold text-gray-800 mb-3">{vip.price} AZN</p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• Gündəlik gəlir: <b>{vip.daily_reward} AZN</b></li>
                    <li>• Müddət: <b>{vip.duration_days} gün</b></li>
                    <li>• Günlük tapşırıq limiti: <b>{vip.daily_task_limit} ədəd</b></li>
                  </ul>
                </div>
                <button
                  onClick={() => { setSelectedVip(vip); setActiveTab('deposit'); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold"
                >
                  Paketi Al
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-4">💳 Balans Artırılması</h2>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 text-sm text-blue-900">
              <p className="mb-1"><b>Ödəniş üçün Rekvizitlər:</b></p>
              <p>Kart Sahibi: <b>{settings?.card_holder}</b></p>
              <p>Kart Nömrəsi: <b className="font-mono text-base">{settings?.card_number}</b></p>
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Paket Seçin:</label>
                <select
                  value={selectedVip?.id || ''}
                  onChange={(e) => setSelectedVip(vips.find((v) => v.id === parseInt(e.target.value)))}
                  className="w-full border p-2.5 rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">Paket seçin...</option>
                  {vips.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} - {v.price} AZN</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ödəniş Qəbzi (Şəkil):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  className="w-full text-sm border p-2 rounded-lg"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg"
              >
                {loading ? 'Yüklənir...' : 'Depoziti Göndər'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-4">💸 Pul Çıxarışı</h2>
            <p className="text-xs text-gray-500 mb-4">Minimum çıxarış məbləği: {settings?.min_withdraw || 10} AZN</p>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Məbləğ (AZN):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full border p-2.5 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bank Kartı Nömrəniz:</label>
                <input
                  type="text"
                  placeholder="16 rəqəmli kart nömrəsi"
                  value={withdrawCard}
                  onChange={(e) => setWithdrawCard(e.target.value)}
                  className="w-full border p-2.5 rounded-lg text-sm font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg"
              >
                {loading ? 'Gözləyin...' : 'Sorğu Göndər'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-4">
            {missions.length === 0 ? (
              <p className="text-center text-gray-500">Hələ ki, aktiv missiya yoxdur.</p>
            ) : (
              missions.map((m) => (
                <div key={m.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{m.title}</h3>
                    <p className="text-sm text-gray-600">{m.description}</p>
                    <span className="inline-block mt-2 text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded">
                      Mükafat: +{m.reward} AZN
                    </span>
                  </div>
                  <button
                    onClick={() => handleCompleteMission(m.id)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm whitespace-nowrap"
                  >
                    Missiyanı Tamamla
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
