import './ConfirmationModal.css';
import { useLanguage } from '../context/LanguageContext';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isSubmitting }) => {
    const { t } = useLanguage();

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
                        {t('general.cancel')}
                    </button>
                    <button className="btn-confirm" onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting ? t('general.confirming') : t('general.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
