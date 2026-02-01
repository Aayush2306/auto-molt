import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import { Key, Loader2, CheckCircle, XCircle, ArrowRight, Wallet, Zap } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const PAYMENT_WALLET = import.meta.env.VITE_PAYMENT_WALLET || '0x0000000000000000000000000000000000000000'
const HOSTING_PRICE_ETH = '0.005'

function Create() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { data: hash, sendTransaction, isPending: isSending } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  const [step, setStep] = useState(1)
  const [apiKey, setApiKey] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [deploymentId, setDeploymentId] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState(null)
  const [progress, setProgress] = useState(0)
  const [paymentHash, setPaymentHash] = useState('')

  useEffect(() => {
    if (isConnected && step === 1) {
      setStep(2)
    } else if (!isConnected && step > 1) {
      setStep(1)
    }
  }, [isConnected, step])

  useEffect(() => {
    if (isConfirmed && hash) {
      setPaymentHash(hash)
      setStep(3)
    }
  }, [isConfirmed, hash])

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
    if (!address) return
    setError('')

    try {
      sendTransaction({
        to: PAYMENT_WALLET,
        value: parseEther(HOSTING_PRICE_ETH)
      })
    } catch (err) {
      setError('Payment failed: ' + err.message)
    }
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
          wallet_address: address,
          payment_signature: paymentHash,
          region: 'nyc3'
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
              <p>Connect your wallet to continue with Base network</p>
              <div className="connect-wrapper">
                <ConnectButton />
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
              <div className="payment-header">
                <span className="payment-label">Weekly Hosting</span>
                <div className="price-display">
                  <span className="price-amount">0.005</span>
                  <span className="price-currency">ETH</span>
                </div>
                <span className="price-network">on Base</span>
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
                disabled={isSending || isConfirming}
              >
                {isSending || isConfirming ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    {isConfirming ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    Pay 0.005 ETH
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
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
