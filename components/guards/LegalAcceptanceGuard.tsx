import React, { useEffect, useState } from 'react';
import { useLegalAcceptance } from '../../hooks/useLegalAcceptance';
import AcceptanceModal from '../legal/AcceptanceModal';

interface LegalAcceptanceGuardProps {
  children: React.ReactNode;
  mandatory?: boolean;
}

export default function LegalAcceptanceGuard({
  children,
  mandatory = true,
}: LegalAcceptanceGuardProps) {
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  
  const {
    pendingPolicies,
    hasPendingItems,
    loading,
    acceptPolicy,
    checkPendingAcceptances,
  } = useLegalAcceptance();

  useEffect(() => {
    if (!hasChecked && !loading) {
      setHasChecked(true);
      if (hasPendingItems) {
        setShowModal(true);
      }
    }
  }, [hasPendingItems, loading, hasChecked]);

  // Re-check when modal closes
  useEffect(() => {
    if (!showModal && hasChecked) {
      checkPendingAcceptances();
    }
  }, [showModal, hasChecked, checkPendingAcceptances]);

  const handleCloseModal = () => {
    if (!mandatory || !hasPendingItems) {
      setShowModal(false);
    }
  };

  // Don't show children if mandatory acceptance is pending
  if (mandatory && hasPendingItems && showModal) {
    return (
      <AcceptanceModal
        visible={showModal}
        pendingPolicies={pendingPolicies}
        onAcceptPolicy={acceptPolicy}
        onClose={handleCloseModal}
        mandatory={mandatory}
      />
    );
  }

  return (
    <>
      {children}
      <AcceptanceModal
        visible={showModal}
        pendingPolicies={pendingPolicies}
        onAcceptPolicy={acceptPolicy}
        onClose={handleCloseModal}
        mandatory={mandatory}
      />
    </>
  );
}