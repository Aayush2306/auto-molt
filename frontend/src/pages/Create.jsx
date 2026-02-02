import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { motion } from 'framer-motion'
import { Key, Loader2, CheckCircle, XCircle, ArrowRight, Wallet, Zap, Gift } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const PAYMENT_WALLET = import.meta.env.VITE_PAYMENT_WALLET || ''
const HOSTING_PRICE_SOL = 0.1
const TEST_MODE = import.meta.env.VITE_TEST_MODE === 'true'

function Create() {
  const navigate = useNavigate()
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()

  const [step, setStep] = useState(1)
  const [apiKey, setApiKey] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [deploymentId, setDeploymentId] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState(null)
  const [progress, setProgress] = useState(0)
  const [paymentHash, setPaymentHash] = useState('')
  const [freeDeployInfo, setFreeDeployInfo] = useState(null)
  const [useFreeDeploy, setUseFreeDeploy] = useState(false)

  // Fetch free deploy info on mount
  useEffect(() => {
    const fetchFreeDeployInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/free-deploys`)
        const data = await response.json()
        setFreeDeployInfo(data)
      } catch (err) {
        console.error('Error fetching free deploy info:', err)
      }
    }
    fetchFreeDeployInfo()
  }, [])

  useEffect(() => {
    if (connected && step === 1) {
      setStep(2)
    } else if (!connected && step > 1) {
      setStep(1)
    }
  }, [connected, step])

  useEffect(() => {
    if (!deploymentId || step !== 4) return

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status/${deploymentId}`)
        const data = await response.json()
        setDeploymentStatus(data)

        switch (data.status) {
          case 'pending':
            setProgress(10)
            break
          case 'creating_droplet':
            setProgress(30)
            break
          case 'waiting_for_droplet':
            setProgress(50)
            break
          case 'configuring_openclaw':
            setProgress(75)
            break
          case 'ready':
            setProgress(100)
            setStep(5)
            break
          case 'failed':
            setError(data.error_message || 'Deployment failed')
            setStep(3)
            break
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [deploymentId, step])

  const handlePayment = async () => {
    if (!publicKey || !PAYMENT_WALLET) return
    setError('')

    // Test mode - skip actual payment
    if (TEST_MODE) {
      setPaymentHash('test_' + Date.now())
      setStep(3)
      return
    }

    try {
      setIsSending(true)

      const recipientPubKey = new PublicKey(PAYMENT_WALLET)
      const lamports = HOSTING_PRICE_SOL * LAMPORTS_PER_SOL

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubKey,
          lamports: lamports
        })
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signature = await sendTransaction(transaction, connection)

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      setPaymentHash(signature)
      setStep(3)
    } catch (err) {
      setError('Payment failed: ' + err.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleFreeDeploy = () => {
    setUseFreeDeploy(true)
    setPaymentHash('free_deploy_' + Date.now())
    setStep(3)
  }

  const handleDeploy = async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      setError('Please enter a valid Anthropic API key (starts with sk-ant-)')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropic_api_key: apiKey,
          wallet_address: publicKey?.toBase58(),
          payment_signature: paymentHash,
          region: 'nyc3',
          use_free_deploy: useFreeDeploy
        })
      })

      const data = await response.json()

      if (data.deployment_id) {
        setDeploymentId(data.deployment_id)
        setStep(4)
      } else {
        throw new Error(data.detail || 'Failed to start deployment')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusText = () => {
    if (!deploymentStatus) return 'Initializing...'
    switch (deploymentStatus.status) {
      case 'pending':
        return 'Preparing your deployment...'
      case 'creating_droplet':
        return 'Spinning up your server...'
      case 'waiting_for_droplet':
        return 'Server is booting up...'
      case 'configuring_openclaw':
        return 'Installing your AI assistant...'
      case 'ready':
        return 'All done!'
      default:
        return deploymentStatus.status
    }
  }

  return (
    <div className="create-page">
      <motion.div
        className="create-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="create-header">
          <Zap className="create-icon" size={40} />
          <h1>Deploy Your AI</h1>
          <p className="subtitle">Get your OpenClaw instance running in minutes</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          {[
            { num: 1, label: 'Connect' },
            { num: 2, label: 'Pay' },
            { num: 3, label: 'API Key' },
            { num: 4, label: 'Deploy' }
          ].map((s, i) => (
            <div key={s.num} className="step-wrapper">
              <div className={`progress-step ${step >= s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}>
                <div className="step-icon">
                  {step > s.num ? <CheckCircle size={18} /> : s.num}
                </div>
                <span>{s.label}</span>
              </div>
              {i < 3 && <div className={`progress-line ${step > s.num ? 'completed' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="step-content">
          {/* Step 1: Connect Wallet */}
          {step === 1 && (
            <motion.div
              className="step-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="step-card-icon">
                <Wallet size={32} />
              </div>
              <h2>Connect Your Wallet</h2>
              <p>Connect your Solana wallet to continue</p>
              <div className="connect-wrapper">
                <WalletMultiButton />
              </div>
            </motion.div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <motion.div
              className="step-card payment-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Free Deploy Banner */}
              {freeDeployInfo?.is_active && freeDeployInfo?.remaining > 0 && (
                <div className="free-deploy-banner">
                  <Gift size={20} />
                  <div className="free-deploy-info">
                    <span className="free-deploy-title">Free Trial Available!</span>
                    <span className="free-deploy-count">
                      {freeDeployInfo.claimed}/{freeDeployInfo.total} claimed
                    </span>
                  </div>
                  <button
                    className="btn btn-success btn-small"
                    onClick={handleFreeDeploy}
                  >
                    Claim Free Week
                  </button>
                </div>
              )}

              <div className="payment-header">
                <span className="payment-label">Weekly Hosting</span>
                <div className="price-display">
                  <span className="price-amount">0.1</span>
                  <span className="price-currency">SOL</span>
                </div>
                <span className="price-network">on Solana</span>
              </div>

              <ul className="payment-features">
                <li><CheckCircle size={16} /> Dedicated cloud server</li>
                <li><CheckCircle size={16} /> Full OpenClaw dashboard</li>
                <li><CheckCircle size={16} /> 50+ integrations ready</li>
                <li><CheckCircle size={16} /> 7 days of hosting</li>
              </ul>

              <button
                className="btn btn-primary btn-large btn-full"
                onClick={handlePayment}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    {TEST_MODE ? 'Continue (Test Mode)' : 'Pay 0.1 SOL'}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
              {TEST_MODE && (
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#f59e0b' }}>
                  Test mode enabled - no payment required
                </p>
              )}
            </motion.div>
          )}

          {/* Step 3: API Key */}
          {step === 3 && (
            <motion.div
              className="step-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="step-card-icon">
                <Key size={32} />
              </div>
              <h2>Enter Your API Key</h2>
              <p>Your Anthropic API key powers the AI</p>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="api-input"
                />
              </div>

              <p className="api-help">
                Get your API key from{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                  console.anthropic.com
                </a>
              </p>

              <button
                className="btn btn-primary btn-large btn-full"
                onClick={handleDeploy}
                disabled={isProcessing || !apiKey}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    Starting...
                  </>
                ) : (
                  <>
                    Deploy Now
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Step 4: Deploying */}
          {step === 4 && (
            <motion.div
              className="step-card deploying-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="deploying-animation">
                <Loader2 size={48} className="spin" />
              </div>
              <h2>Setting Up Your Server</h2>
              <p className="status-text">{getStatusText()}</p>

              <div className="deploy-progress">
                <div
                  className="deploy-progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-info">
                <span className="progress-percent">{progress}%</span>
                <span className="estimate-time">~3-5 minutes</span>
              </div>

              {deploymentStatus?.ip_address && (
                <div className="ip-badge">
                  Server: <code>{deploymentStatus.ip_address}</code>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {step === 5 && (
            <motion.div
              className="step-card success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="success-animation">
                <CheckCircle size={64} />
              </div>
              <h2>You're All Set!</h2>
              <p>Your AI assistant is live and ready</p>

              <div className="success-actions">
                {deploymentStatus?.dashboard_url && (
                  <a
                    href={deploymentStatus.dashboard_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-large"
                  >
                    Open Dashboard
                    <ArrowRight size={20} />
                  </a>
                )}

                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/dashboard')}
                >
                  View My Deployments
                </button>
              </div>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <XCircle size={20} />
              {error}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default Create
