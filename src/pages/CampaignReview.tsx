import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Redirect to Dashboard with sheet auto-open
const CampaignReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/dashboard?open=${id}`, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [id, navigate]);

  return null;
};

export default CampaignReview;
