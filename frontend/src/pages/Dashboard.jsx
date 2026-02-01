import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import {
  Server,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Plus,
  Calendar,
  Cpu,
  Globe,
  Trash2,
  Wallet
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Dashboard() {
  const { address, isConnected } = useAccount()
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isConnected && address) {
      fetchDeployments()
    } else {
      setLoading(false)
    }
  }, [isConnected, address])

  const fetchDeployments = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_URL}/deployments?wallet=${address}`
      )
      const data = await response.json()
      setDeployments(data.deployments || [])
    } catch (err) {
      setError('Failed to fetch deployments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculateDaysRemaining = (expiresAt) => {
    if (!expiresAt) return 0
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diff = expiry - now
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
    return Math.max(0, days)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'status-ready'
      case 'failed':
        return 'status-failed'
      default:
        return 'status-pending'
    }
  }

  const handleDelete = async (deploymentId) => {
    if (!confirm('Are you sure you want to delete this deployment?')) {
      return
    }

    try {
      await fetch(`${API_URL}/deployment/${deploymentId}`, {
        method: 'DELETE'
      })
      fetchDeployments()
    } catch (err) {
      setError('Failed to delete deployment')
    }
  }

  if (!isConnected) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <motion.div
            className="connect-prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="prompt-icon-wrapper">
              <Wallet size={48} />
            </div>
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to view your deployments</p>
            <ConnectButton />
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="header-left">
            <h1>My Deployments</h1>
            <p>Manage your AI instances</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={fetchDeployments}>
              <RefreshCw size={18} />
              Refresh
            </button>
            <Link to="/create" className="btn btn-primary">
              <Plus size={18} />
              New
            </Link>
          </div>
        </motion.div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw className="spin" size={32} />
            <p>Loading deployments...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={fetchDeployments}>
              Try Again
            </button>
          </div>
        ) : deployments.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="empty-icon-wrapper">
              <Server size={48} />
            </div>
            <h3>No Deployments Yet</h3>
            <p>Deploy your first AI assistant in minutes</p>
            <Link to="/create" className="btn btn-primary">
              <Plus size={18} />
              Create Deployment
            </Link>
          </motion.div>
        ) : (
          <div className="deployments-grid">
            {deployments.map((deployment, index) => {
              const daysRemaining = calculateDaysRemaining(deployment.expires_at)
              const isExpired = daysRemaining === 0
              const isExpiringSoon = daysRemaining <= 2 && !isExpired

              return (
                <motion.div
                  key={deployment.deployment_id}
                  className={`deployment-card ${isExpired ? 'expired' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="card-header">
                    <div className="card-title">
                      <Cpu size={18} />
                      <span>claw-{deployment.deployment_id.slice(0, 6)}</span>
                    </div>
                    <span className={`status-badge ${getStatusColor(deployment.status)}`}>
                      {deployment.status}
                    </span>
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <Globe size={16} />
                      <span>{deployment.ip_address || 'Provisioning...'}</span>
                    </div>

                    <div className="info-row">
                      <Calendar size={16} />
                      <span>Created {new Date(deployment.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className={`days-remaining ${isExpired ? 'expired' : isExpiringSoon ? 'warning' : ''}`}>
                      <Clock size={20} />
                      <div className="days-info">
                        <span className="days-count">
                          {isExpired ? 'Expired' : `${daysRemaining} days`}
                        </span>
                        <span className="days-label">
                          {isExpired ? 'Renew to continue' : 'remaining'}
                        </span>
                      </div>
                    </div>

                    <div className="time-progress">
                      <div
                        className="time-progress-bar"
                        style={{ width: `${Math.min(100, (daysRemaining / 7) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="card-actions">
                    {deployment.status === 'ready' && deployment.dashboard_url && !isExpired && (
                      <a
                        href={deployment.dashboard_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                      >
                        Dashboard
                        <ExternalLink size={16} />
                      </a>
                    )}

                    {isExpired && (
                      <Link to="/create" className="btn btn-primary">
                        Renew
                      </Link>
                    )}

                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(deployment.deployment_id)}
                      title="Delete deployment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        <div className="wallet-info">
          <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
