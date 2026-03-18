import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  CircleOff,
  CreditCard,
  Edit2,
  Eye,
  FileText,
  Globe,
  Home,
  LifeBuoy,
  Loader2,
  Lock,
  MessageCircle,
  Pin,
  Plus,
  Scissors,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import DatePicker from "react-datepicker";
import { enGB } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import useScrollLock from "../../../hooks/useScrollLock";
import AdminFilterBar from "../../../components/dashboard/AdminFilterBar";
import {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from "../../../api/policyApi";

const CONTENT_SCHEMA = "happytails-policy-v1";

const POLICY_CATEGORY_OPTIONS = [
  { value: "booking", label: "Booking Policy", icon: CalendarCheck },
  { value: "cancellation", label: "Cancellation Policy", icon: XCircle },
  { value: "grooming", label: "Grooming Safety", icon: Scissors },
  { value: "boarding", label: "Boarding Policy", icon: Home },
  { value: "payment", label: "Payment Policy", icon: CreditCard },
  {
    value: "pet-health",
    label: "Pet Health Requirements",
    icon: Stethoscope,
  },
  { value: "faq", label: "FAQ / Quick Answers", icon: MessageCircle },
  { value: "support", label: "Support CTA", icon: LifeBuoy },
  { value: "hero", label: "Hero / Overview", icon: Sparkles },
];

const POLICY_TYPE_OPTIONS = [
  { value: "accordion", label: "Accordion" },
  { value: "highlight-card", label: "Highlight Card" },
  { value: "faq", label: "FAQ" },
  { value: "hero-content", label: "Hero Content" },
  { value: "support-cta", label: "Support CTA" },
];

const TARGET_SECTION_OPTIONS = [
  { value: "hero", label: "Hero" },
  { value: "policy-overview", label: "Policy Overview" },
  { value: "detailed-guidelines", label: "Detailed Guidelines" },
  { value: "pet-health-side-card", label: "Pet Health Requirements" },
  { value: "quick-reminder", label: "Quick Reminder" },
  { value: "safety-promise", label: "Safety Promise Cards" },
  { value: "faq", label: "FAQ" },
  { value: "support-cta", label: "Support CTA" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "hidden", label: "Hidden" },
];

const ICON_OPTIONS = [
  { value: "calendar-check", label: "Calendar", icon: CalendarCheck },
  { value: "shield-check", label: "Shield", icon: ShieldCheck },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "credit-card", label: "Payment", icon: CreditCard },
  { value: "message-circle", label: "Chat", icon: MessageCircle },
  { value: "life-buoy", label: "Support", icon: LifeBuoy },
  { value: "stethoscope", label: "Health", icon: Stethoscope },
  { value: "home", label: "Boarding", icon: Home },
  { value: "book-open", label: "Guide", icon: BookOpen },
];

const TONE_OPTIONS = [
  { value: "booking", label: "Booking" },
  { value: "cancellation", label: "Cancellation" },
  { value: "health", label: "Health" },
  { value: "payment", label: "Payment" },
  { value: "safety", label: "Safety" },
  { value: "faq", label: "FAQ" },
  { value: "neutral", label: "Neutral" },
];

const API_TYPE_BY_CATEGORY = {
  cancellation: "cancellation",
  payment: "refund",
  hero: "terms",
};

const CATEGORY_BY_API_TYPE = {
  cancellation: "cancellation",
  refund: "payment",
  privacy: "hero",
  terms: "hero",
  general: "booking",
};

const TYPE_DEFAULT_TARGET = {
  accordion: "detailed-guidelines",
  "highlight-card": "policy-overview",
  faq: "faq",
  "hero-content": "hero",
  "support-cta": "support-cta",
};

const TONE_STYLES = {
  booking: "bg-[#FFF1E7] border-[#F9D1BA] text-[#B45B34]",
  cancellation: "bg-[#FFF1F3] border-[#F9CDD4] text-[#B83A4B]",
  health: "bg-[#F0FAF3] border-[#CDEED8] text-[#2F7D4D]",
  payment: "bg-[#EEF2FF] border-[#D7DEFF] text-[#3742A7]",
  safety: "bg-[#FFF7EF] border-[#F7DEBC] text-[#AF6C2F]",
  faq: "bg-[#F1F5F9] border-[#D9E2EC] text-[#3E4C59]",
  neutral: "bg-[#F8FAFC] border-[#E2E8F0] text-[#52606D]",
};

const STATUS_STYLES = {
  draft: "bg-[#FEF9C3] border-[#FDE68A] text-[#92400E]",
  published: "bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]",
  archived: "bg-[#F1F5F9] border-[#D9E2EC] text-[#475569]",
};

const VISIBILITY_STYLES = {
  public: "bg-[#EAF4FF] border-[#C7E2FE] text-[#1E5EA8]",
  internal: "bg-[#F3F6FA] border-[#D9E2EC] text-[#486581]",
  hidden: "bg-[#FFF1F3] border-[#F9CDD4] text-[#B83A4B]",
};

const TYPE_STYLES = {
  accordion: "bg-[#FFF4ED] border-[#F0BFAC] text-[#B45F40]",
  "highlight-card": "bg-[#F5F3FF] border-[#E4D8FD] text-[#6D44C0]",
  faq: "bg-[#F3F6FA] border-[#D9E2EC] text-[#486581]",
  "hero-content": "bg-[#EEF2FF] border-[#D7DEFF] text-[#3742A7]",
  "support-cta": "bg-[#F0FAF3] border-[#CDEED8] text-[#2F7D4D]",
};

const ICON_COMPONENTS = {
  "calendar-check": CalendarCheck,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  "credit-card": CreditCard,
  "message-circle": MessageCircle,
  "life-buoy": LifeBuoy,
  stethoscope: Stethoscope,
  home: Home,
  "book-open": BookOpen,
};

const makeDefaultForm = (displayOrder = 1) => ({
  id: "",
  title: "",
  slug: "",
  category: "booking",
  policyType: "accordion",
  shortDescription: "",
  internalNotes: "",
  summaryText: "",
  bulletsText: "",
  detailedContent: "",
  requiredBadge: false,
  cardTitle: "",
  cardDescription: "",
  accentTone: "booking",
  optionalTag: "",
  question: "",
  answer: "",
  isMostAsked: false,
  eyebrowLabel: "",
  heroTitle: "",
  heroDescription: "",
  ctaPrimaryText: "",
  ctaPrimaryLink: "",
  ctaSecondaryText: "",
  ctaSecondaryLink: "",
  supportTitle: "",
  supportDescription: "",
  supportLiveChatLabel: "Live Chat",
  supportEmailLabel: "Email",
  supportCallLabel: "Call Us",
  targetSection: TYPE_DEFAULT_TARGET.accordion,
  displayOrder,
  isFeatured: false,
  showBadge: false,
  badgeText: "",
  iconKey: "calendar-check",
  iconStyle: "outline",
  themeColor: "booking",
  visibility: "public",
  isPublic: true,
  status: "draft",
  effectiveDate: "",
  lastReviewedDate: "",
  versionLabel: "v1.0",
  requiresAcknowledgement: false,
  createdByName: "",
  updatedAt: "",
  apiType: "general",
});

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const splitBullets = (value) =>
  String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const toDateInput = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toPickerDate = (dateValue) => {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toIsoDate = (dateValue) => {
  if (!dateValue) return undefined;
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getOptionLabel = (options, value, fallback = "-") =>
  options.find((option) => option.value === value)?.label || fallback;

const truncateText = (value, maxLength = 38) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "No description";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const categoryMetaByValue = Object.fromEntries(
  POLICY_CATEGORY_OPTIONS.map((item) => [item.value, item]),
);

const resolveCategoryTone = (category) => {
  switch (category) {
    case "booking":
      return "booking";
    case "cancellation":
      return "cancellation";
    case "pet-health":
      return "health";
    case "payment":
      return "payment";
    case "grooming":
    case "boarding":
      return "safety";
    case "faq":
      return "faq";
    default:
      return "neutral";
  }
};

const parseStructuredContent = (content) => {
  if (typeof content !== "string") return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema === CONTENT_SCHEMA || parsed.display || parsed.faq) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const normalizePolicyFromApi = (policy) => {
  const structured = parseStructuredContent(policy?.content);
  const display = structured?.display || {};
  const publish = structured?.publishing || {};
  const content = structured?.content || {};
  const faq = structured?.faq || {};
  const hero = structured?.hero || {};
  const support = structured?.support || {};

  const category =
    structured?.category || CATEGORY_BY_API_TYPE[policy?.type] || "booking";
  const policyType =
    structured?.policyType ||
    (category === "faq"
      ? "faq"
      : category === "hero"
        ? "hero-content"
        : category === "support"
          ? "support-cta"
          : "accordion");

  const title = policy?.title || "Untitled policy";
  const displayOrder =
    Number(display.displayOrder || structured?.displayOrder || 1) || 1;
  const status =
    publish.status || (policy?.isActive ? "published" : "draft") || "draft";
  const visibility =
    display.visibility || (policy?.isActive ? "public" : "hidden");

  return {
    ...makeDefaultForm(displayOrder),
    id: policy?._id || "",
    title,
    slug: policy?.slug || slugify(title),
    category,
    policyType,
    shortDescription: structured?.shortDescription || "",
    internalNotes: structured?.internalNotes || "",
    summaryText: content.summaryText || "",
    bulletsText: Array.isArray(content.bullets)
      ? content.bullets.join("\n")
      : "",
    detailedContent:
      content.detailedContent || (!structured ? policy?.content || "" : ""),
    requiredBadge: Boolean(content.requiredBadge),
    cardTitle: content.cardTitle || "",
    cardDescription: content.cardDescription || "",
    accentTone: content.accentTone || resolveCategoryTone(category),
    optionalTag: content.optionalTag || "",
    question: faq.question || "",
    answer: faq.answer || "",
    isMostAsked: Boolean(faq.isMostAsked),
    eyebrowLabel: hero.eyebrowLabel || "",
    heroTitle: hero.title || "",
    heroDescription: hero.description || "",
    ctaPrimaryText: hero.ctaPrimaryText || "",
    ctaPrimaryLink: hero.ctaPrimaryLink || "",
    ctaSecondaryText: hero.ctaSecondaryText || "",
    ctaSecondaryLink: hero.ctaSecondaryLink || "",
    supportTitle: support.title || "",
    supportDescription: support.description || "",
    supportLiveChatLabel: support.liveChatLabel || "Live Chat",
    supportEmailLabel: support.emailLabel || "Email",
    supportCallLabel: support.callLabel || "Call Us",
    targetSection:
      display.targetSection ||
      TYPE_DEFAULT_TARGET[policyType] ||
      "detailed-guidelines",
    displayOrder,
    isFeatured: Boolean(display.isFeatured),
    showBadge: Boolean(display.showBadge),
    badgeText: display.badgeText || "",
    iconKey: display.iconKey || structured?.iconKey || "calendar-check",
    iconStyle: display.iconStyle || "outline",
    themeColor: display.themeColor || resolveCategoryTone(category),
    visibility,
    isPublic:
      display.isPublic === undefined
        ? policy?.isActive !== false
        : Boolean(display.isPublic),
    status,
    effectiveDate: toDateInput(policy?.effectiveDate),
    lastReviewedDate: toDateInput(publish.lastReviewedDate),
    versionLabel: publish.versionLabel || policy?.version || "v1.0",
    requiresAcknowledgement: Boolean(publish.requiresAcknowledgement),
    createdByName: policy?.createdBy?.name || "",
    updatedAt: policy?.updatedAt || "",
    apiType: policy?.type || "general",
  };
};

const toStructuredContentPayload = (draft) =>
  JSON.stringify({
    schema: CONTENT_SCHEMA,
    category: draft.category,
    policyType: draft.policyType,
    shortDescription: draft.shortDescription?.trim() || "",
    internalNotes: draft.internalNotes?.trim() || "",
    content: {
      summaryText: draft.summaryText?.trim() || "",
      bullets: splitBullets(draft.bulletsText),
      detailedContent: draft.detailedContent?.trim() || "",
      requiredBadge: Boolean(draft.requiredBadge),
      cardTitle: draft.cardTitle?.trim() || "",
      cardDescription: draft.cardDescription?.trim() || "",
      accentTone: draft.accentTone,
      optionalTag: draft.optionalTag?.trim() || "",
    },
    faq: {
      question: draft.question?.trim() || "",
      answer: draft.answer?.trim() || "",
      isMostAsked: Boolean(draft.isMostAsked),
    },
    hero: {
      eyebrowLabel: draft.eyebrowLabel?.trim() || "",
      title: draft.heroTitle?.trim() || "",
      description: draft.heroDescription?.trim() || "",
      ctaPrimaryText: draft.ctaPrimaryText?.trim() || "",
      ctaPrimaryLink: draft.ctaPrimaryLink?.trim() || "",
      ctaSecondaryText: draft.ctaSecondaryText?.trim() || "",
      ctaSecondaryLink: draft.ctaSecondaryLink?.trim() || "",
    },
    support: {
      title: draft.supportTitle?.trim() || "",
      description: draft.supportDescription?.trim() || "",
      liveChatLabel: draft.supportLiveChatLabel?.trim() || "Live Chat",
      emailLabel: draft.supportEmailLabel?.trim() || "Email",
      callLabel: draft.supportCallLabel?.trim() || "Call Us",
    },
    display: {
      targetSection: draft.targetSection,
      displayOrder: Number(draft.displayOrder) || 1,
      isFeatured: Boolean(draft.isFeatured),
      showBadge: Boolean(draft.showBadge),
      badgeText: draft.badgeText?.trim() || "",
      iconKey: draft.iconKey,
      iconStyle: draft.iconStyle,
      themeColor: draft.themeColor,
      visibility: draft.visibility,
      isPublic: Boolean(draft.isPublic),
    },
    publishing: {
      status: draft.status,
      lastReviewedDate: toIsoDate(draft.lastReviewedDate),
      versionLabel: draft.versionLabel?.trim() || "v1.0",
      requiresAcknowledgement: Boolean(draft.requiresAcknowledgement),
    },
  });

const toApiPayload = (draft) => {
  const resolvedApiType =
    draft.apiType || API_TYPE_BY_CATEGORY[draft.category] || "general";
  const isPubliclyVisible =
    draft.status === "published" &&
    draft.visibility === "public" &&
    Boolean(draft.isPublic);

  return {
    title: draft.title.trim(),
    content: toStructuredContentPayload(draft),
    type: resolvedApiType,
    version: draft.versionLabel?.trim() || "v1.0",
    effectiveDate: toIsoDate(draft.effectiveDate) || new Date().toISOString(),
    isActive: isPubliclyVisible,
  };
};

const validateDraft = (draft) => {
  const nextErrors = {};
  const bullets = splitBullets(draft.bulletsText);

  if (!draft.title.trim()) {
    nextErrors.title = "Policy title is required.";
  } else if (draft.title.trim().length < 3) {
    nextErrors.title = "Policy title must be at least 3 characters.";
  }

  if (draft.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
    nextErrors.slug = "Slug contains invalid characters.";
  }

  if (!draft.category) nextErrors.category = "Category is required.";
  if (!draft.policyType) nextErrors.policyType = "Policy type is required.";
  if (!draft.targetSection)
    nextErrors.targetSection = "Target section is required.";
  if (!draft.status) nextErrors.status = "Status is required.";

  if (
    !Number.isInteger(Number(draft.displayOrder)) ||
    Number(draft.displayOrder) < 1
  ) {
    nextErrors.displayOrder = "Display order must be a positive integer.";
  }

  if (draft.policyType === "accordion") {
    if (bullets.length === 0) {
      nextErrors.bulletsText =
        "Accordion must include at least one bullet item.";
    }
    if (!draft.summaryText.trim() && !draft.detailedContent.trim()) {
      nextErrors.summaryText =
        "Provide summary or detailed content for accordion.";
    }
  }

  if (draft.policyType === "faq") {
    if (!draft.question.trim()) nextErrors.question = "Question is required.";
    if (!draft.answer.trim()) nextErrors.answer = "Answer is required.";
  }

  if (draft.policyType === "hero-content") {
    if (!draft.heroTitle.trim())
      nextErrors.heroTitle = "Hero title is required.";
    if (!draft.heroDescription.trim()) {
      nextErrors.heroDescription = "Hero description is required.";
    }
  }

  if (draft.policyType === "support-cta") {
    if (!draft.supportTitle.trim()) {
      nextErrors.supportTitle = "Support section title is required.";
    }
    if (!draft.supportDescription.trim()) {
      nextErrors.supportDescription = "Support description is required.";
    }
  }

  if (draft.status === "published") {
    if (draft.visibility !== "public" || !draft.isPublic) {
      nextErrors.visibility =
        "Published policy must be public and customer-visible.";
    }
  }

  return nextErrors;
};

const PolicyStatCard = ({ icon, title, value, helper, iconClass }) => {
  const IconComponent = icon;

  return (
    <div className="rounded-[24px] border border-[#2D3436]/8 bg-white p-5 shadow-[0_10px_28px_rgba(45,52,54,0.05)]">
      <div className="flex items-center gap-3">
        <div
          className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${iconClass}`}
        >
          {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2D3436]/40">
            {title}
          </p>
          <p className="mt-1 text-2xl font-black leading-none tracking-tight text-[#2D3436]">
            {value}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-[#2D3436]/45">{helper}</p>
    </div>
  );
};

const SectionTitle = ({ title }) => (
  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2D3436]/45">
    {title}
  </h3>
);

const SoftBadge = ({ children, className }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
  >
    {children}
  </span>
);

const CategoryBadge = ({ category }) => {
  const meta = categoryMetaByValue[category] || categoryMetaByValue.booking;
  const tone =
    TONE_STYLES[resolveCategoryTone(category)] || TONE_STYLES.neutral;
  return <SoftBadge className={tone}>{meta.label}</SoftBadge>;
};

const TypeBadge = ({ type }) => (
  <SoftBadge className={TYPE_STYLES[type] || TYPE_STYLES.accordion}>
    {getOptionLabel(POLICY_TYPE_OPTIONS, type, "Unknown")}
  </SoftBadge>
);

const VisibilityBadge = ({ visibility }) => (
  <SoftBadge
    className={VISIBILITY_STYLES[visibility] || VISIBILITY_STYLES.hidden}
  >
    {getOptionLabel(VISIBILITY_OPTIONS, visibility, "Hidden")}
  </SoftBadge>
);

const StatusBadge = ({ status }) => (
  <SoftBadge className={STATUS_STYLES[status] || STATUS_STYLES.draft}>
    {getOptionLabel(STATUS_OPTIONS, status, "Draft")}
  </SoftBadge>
);

const FormError = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs font-medium text-[#C02F47]">{message}</p>
  ) : null;

const FieldWrapper = ({ label, required, children, error }) => (
  <div>
    <label className="mb-1.5 block text-[13px] font-semibold text-[#2D3436]">
      {label}
      {required ? <span className="ml-1 text-[#D97853]">*</span> : null}
    </label>
    {children}
    <FormError message={error} />
  </div>
);

const FormSelect = ({
  value,
  options,
  onChange,
  hasError = false,
  placeholder = "Select option",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedLabel =
    options.find((option) => option.value === value)?.label || placeholder;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-3.5 text-sm font-medium text-[#2D3436] transition-all focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
          hasError ? "border-[#E67C8C]" : "border-[#2D3436]/12"
        } ${isOpen ? "border-[#D97853]" : ""}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ArrowDown
          className={`h-4 w-4 text-[#60758A] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-40 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-[#E9E2DA] bg-white py-1 shadow-[0_16px_30px_rgba(45,52,54,0.12)]">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-[#FFF4ED] font-semibold text-[#B45F40]"
                    : "text-[#2D3436] hover:bg-[#F8FAFB]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={onChange}
    className={`flex h-11 w-full items-center justify-between rounded-2xl border px-3.5 transition-all ${
      checked
        ? "border-[#F5CCB9] bg-[#FFF4ED]"
        : "border-[#E6EAED] bg-white hover:bg-[#F8FAFB]"
    }`}
  >
    <span
      className={`text-sm font-semibold ${checked ? "text-[#AF6242]" : "text-[#4F575D]"}`}
    >
      {label}
    </span>
    <span
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-[#D97853]" : "bg-[#D0D6DB]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </span>
  </button>
);

const ResolvePreviewIcon = ({ iconKey, className = "h-4 w-4" }) => {
  const Icon = ICON_COMPONENTS[iconKey] || BookOpen;
  return <Icon className={className} />;
};

const PolicyPreview = ({ policy }) => {
  if (policy.policyType === "accordion") {
    const bullets = splitBullets(policy.bulletsText);
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4ED] text-[#D97853]">
            <ResolvePreviewIcon iconKey={policy.iconKey} />
          </div>
          <p className="font-bold text-[#1F2933]">{policy.title}</p>
        </div>
        {policy.summaryText ? (
          <p className="mb-2 text-sm text-[#52606D]">{policy.summaryText}</p>
        ) : null}
        <ul className="space-y-1.5 text-sm text-[#334E68]">
          {bullets.slice(0, 3).map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#D97853]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (policy.policyType === "highlight-card") {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#3742A7]">
            <ResolvePreviewIcon iconKey={policy.iconKey} />
          </div>
          <p className="font-bold text-[#1F2933]">
            {policy.cardTitle || policy.title}
          </p>
        </div>
        <p className="text-sm text-[#52606D]">
          {policy.cardDescription || policy.shortDescription || "No content"}
        </p>
      </div>
    );
  }

  if (policy.policyType === "faq") {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F6FA] text-[#486581]">
            <MessageCircle className="h-4 w-4" />
          </div>
          <p className="font-bold text-[#1F2933]">
            {policy.question || policy.title}
          </p>
          {policy.isMostAsked ? (
            <SoftBadge className="border-[#FBD5BF] bg-[#FFF4ED] text-[#B45F40]">
              Most Asked
            </SoftBadge>
          ) : null}
        </div>
        <p className="text-sm text-[#52606D]">{policy.answer || "No answer"}</p>
      </div>
    );
  }

  if (policy.policyType === "hero-content") {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-r from-[#1E2A3A] to-[#25344A] p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
          {policy.eyebrowLabel || "HappyTails Guide"}
        </p>
        <p className="mt-1 text-lg font-extrabold leading-tight">
          {policy.heroTitle || policy.title}
        </p>
        <p className="mt-2 text-sm text-white/80">
          {policy.heroDescription || "No hero description"}
        </p>
      </div>
    );
  }

  if (policy.policyType === "support-cta") {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-r from-[#1E2A3A] to-[#25344A] p-4 text-white">
        <p className="text-lg font-extrabold leading-tight">
          {policy.supportTitle || policy.title}
        </p>
        <p className="mt-2 text-sm text-white/80">
          {policy.supportDescription || "No support description"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <SoftBadge className="border-white/25 bg-white/10 text-white">
            {policy.supportLiveChatLabel || "Live Chat"}
          </SoftBadge>
          <SoftBadge className="border-white/25 bg-white/10 text-white">
            {policy.supportEmailLabel || "Email"}
          </SoftBadge>
          <SoftBadge className="border-white/25 bg-white/10 text-white">
            {policy.supportCallLabel || "Call Us"}
          </SoftBadge>
        </div>
      </div>
    );
  }

  return null;
};

export default function AdminPolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated-desc");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [formMode, setFormMode] = useState("create");
  const [draft, setDraft] = useState(makeDefaultForm());
  const [formErrors, setFormErrors] = useState({});
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [publishMode, setPublishMode] = useState("publish");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const isModalOpen =
    showFormModal || showViewModal || showDeleteModal || showPublishModal;
  useScrollLock(isModalOpen);

  const backendTypeFilter = useMemo(() => {
    if (categoryFilter === "all") return undefined;
    return API_TYPE_BY_CATEGORY[categoryFilter] || "general";
  }, [categoryFilter]);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = backendTypeFilter ? { type: backendTypeFilter } : {};
      const response = await getAllPolicies(params);
      const rawPolicies = response?.data?.policies || [];
      setPolicies(rawPolicies.map(normalizePolicyFromApi));
    } catch (fetchError) {
      setError(extractErrorMessage(fetchError, "Cannot load policy list."));
    } finally {
      setLoading(false);
    }
  }, [backendTypeFilter]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const stats = useMemo(() => {
    const total = policies.length;
    const published = policies.filter(
      (item) => item.status === "published",
    ).length;
    const draftCount = policies.filter(
      (item) => item.status === "draft",
    ).length;
    const faqCount = policies.filter(
      (item) => item.policyType === "faq",
    ).length;

    return {
      total,
      published,
      draft: draftCount,
      faq: faqCount,
    };
  }, [policies]);

  const filteredPolicies = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();

    const result = policies.filter((policy) => {
      if (statusFilter !== "all" && policy.status !== statusFilter)
        return false;
      if (categoryFilter !== "all" && policy.category !== categoryFilter) {
        return false;
      }
      if (
        visibilityFilter !== "all" &&
        policy.visibility !== visibilityFilter
      ) {
        return false;
      }
      if (targetFilter !== "all" && policy.targetSection !== targetFilter) {
        return false;
      }

      if (!lowerSearch) return true;
      const haystack = [
        policy.title,
        policy.slug,
        policy.shortDescription,
        policy.question,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(lowerSearch);
    });

    result.sort((left, right) => {
      if (sortBy === "display-order") {
        return Number(left.displayOrder) - Number(right.displayOrder);
      }
      if (sortBy === "alphabetical") {
        return left.title.localeCompare(right.title);
      }
      return (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    });

    return result;
  }, [
    policies,
    searchTerm,
    statusFilter,
    categoryFilter,
    visibilityFilter,
    targetFilter,
    sortBy,
  ]);

  const openCreateModal = () => {
    const maxOrder = policies.reduce(
      (maxValue, item) => Math.max(maxValue, Number(item.displayOrder) || 0),
      0,
    );
    setFormMode("create");
    setDraft(makeDefaultForm(maxOrder + 1));
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (policy) => {
    setFormMode("edit");
    setDraft({ ...policy });
    setFormErrors({});
    setShowFormModal(true);
  };

  const openDetailModal = (policy) => {
    setSelectedPolicy(policy);
    setShowViewModal(true);
  };

  const openDeleteModal = (policy) => {
    setSelectedPolicy(policy);
    setShowDeleteModal(true);
  };

  const openPublishModal = (policy, mode) => {
    setSelectedPolicy(policy);
    setPublishMode(mode);
    setShowPublishModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setDraft(makeDefaultForm());
    setFormErrors({});
  };

  const handleRowAction = (event, callback) => {
    event.stopPropagation();
    callback();
  };

  const handleFieldChange = (name, value) => {
    setDraft((current) => {
      const nextDraft = { ...current, [name]: value };
      if (name === "title") {
        nextDraft.slug = slugify(value);
        if (!current.cardTitle) {
          nextDraft.cardTitle = value;
        }
      }
      if (name === "category" && !current.themeColor) {
        nextDraft.themeColor = resolveCategoryTone(value);
      }
      if (name === "policyType") {
        nextDraft.targetSection =
          TYPE_DEFAULT_TARGET[value] || current.targetSection;
      }
      if (name === "status" && value !== "published") {
        nextDraft.isPublic = false;
      }
      return nextDraft;
    });
  };

  const handleSubmitForm = async (event) => {
    event.preventDefault();
    const nextErrors = validateDraft(draft);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSubmitLoading(true);
      setError("");
      const payload = toApiPayload(draft);
      if (formMode === "create") {
        await createPolicy(payload);
      } else {
        await updatePolicy(draft.id, payload);
      }
      closeFormModal();
      await fetchPolicies();
    } catch (submitError) {
      setError(extractErrorMessage(submitError, "Cannot save policy."));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPolicy) return;
    try {
      setDeleteLoading(true);
      setError("");
      await deletePolicy(selectedPolicy.id);
      setShowDeleteModal(false);
      setSelectedPolicy(null);
      await fetchPolicies();
    } catch (deleteError) {
      setError(extractErrorMessage(deleteError, "Cannot delete policy."));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!selectedPolicy) return;
    const nextPolicy = {
      ...selectedPolicy,
      status: publishMode === "publish" ? "published" : "draft",
      visibility: publishMode === "publish" ? "public" : "hidden",
      isPublic: publishMode === "publish",
    };

    const nextErrors = validateDraft(nextPolicy);
    if (Object.keys(nextErrors).length > 0) {
      setError(
        "Policy content is not valid for publishing. Please edit and complete required fields.",
      );
      setShowPublishModal(false);
      return;
    }

    try {
      setPublishLoading(true);
      setError("");
      await updatePolicy(selectedPolicy.id, toApiPayload(nextPolicy));
      setShowPublishModal(false);
      setSelectedPolicy(null);
      await fetchPolicies();
    } catch (publishError) {
      setError(
        extractErrorMessage(publishError, "Cannot update publish status."),
      );
    } finally {
      setPublishLoading(false);
    }
  };

  const persistOrderSwap = async (firstPolicy, secondPolicy) => {
    await Promise.all([
      updatePolicy(firstPolicy.id, toApiPayload(firstPolicy)),
      updatePolicy(secondPolicy.id, toApiPayload(secondPolicy)),
    ]);
  };

  const handleMoveOrder = async (policy, direction) => {
    const sameSection = [...policies]
      .filter((item) => item.targetSection === policy.targetSection)
      .sort(
        (left, right) => Number(left.displayOrder) - Number(right.displayOrder),
      );

    const currentIndex = sameSection.findIndex((item) => item.id === policy.id);
    if (currentIndex < 0) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sameSection.length) return;

    const currentPolicy = sameSection[currentIndex];
    const swapPolicy = sameSection[swapIndex];

    const updatedCurrent = {
      ...currentPolicy,
      displayOrder: swapPolicy.displayOrder,
    };
    const updatedSwap = {
      ...swapPolicy,
      displayOrder: currentPolicy.displayOrder,
    };

    setPolicies((prevPolicies) =>
      prevPolicies.map((item) => {
        if (item.id === updatedCurrent.id) return updatedCurrent;
        if (item.id === updatedSwap.id) return updatedSwap;
        return item;
      }),
    );

    try {
      await persistOrderSwap(updatedCurrent, updatedSwap);
    } catch (swapError) {
      setError(extractErrorMessage(swapError, "Cannot reorder policies."));
      await fetchPolicies();
    }
  };

  const renderTypeSpecificFields = () => {
    if (draft.policyType === "accordion") {
      return (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <FieldWrapper label="Summary Text" error={formErrors.summaryText}>
            <textarea
              rows={3}
              value={draft.summaryText}
              onChange={(event) =>
                handleFieldChange("summaryText", event.target.value)
              }
              className="w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Short summary shown before bullet points"
            />
          </FieldWrapper>

          <FieldWrapper
            label="Detailed bullet items"
            error={formErrors.bulletsText}
          >
            <textarea
              rows={3}
              value={draft.bulletsText}
              onChange={(event) =>
                handleFieldChange("bulletsText", event.target.value)
              }
              className={`w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                formErrors.bulletsText
                  ? "border-[#E67C8C]"
                  : "border-[#2D3436]/12"
              }`}
              placeholder={
                "Each line is a bullet item\nUse one bullet per line"
              }
            />
          </FieldWrapper>

          <FieldWrapper label="Expandable detailed content">
            <textarea
              rows={4}
              value={draft.detailedContent}
              onChange={(event) =>
                handleFieldChange("detailedContent", event.target.value)
              }
              className="w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Optional longer paragraph for expanded content"
            />
          </FieldWrapper>

          <div className="space-y-3.5">
            <FieldWrapper label="Icon Picker">
              <FormSelect
                value={draft.iconKey}
                options={ICON_OPTIONS}
                onChange={(nextValue) =>
                  handleFieldChange("iconKey", nextValue)
                }
              />
            </FieldWrapper>

            <ToggleSwitch
              checked={draft.requiredBadge}
              onChange={() =>
                handleFieldChange("requiredBadge", !draft.requiredBadge)
              }
              label="Required badge toggle"
            />
          </div>
        </div>
      );
    }

    if (draft.policyType === "highlight-card") {
      return (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <FieldWrapper label="Card title" required>
            <input
              type="text"
              value={draft.cardTitle}
              onChange={(event) =>
                handleFieldChange("cardTitle", event.target.value)
              }
              className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Short card heading"
            />
          </FieldWrapper>

          <FieldWrapper label="Card description" required>
            <textarea
              rows={3}
              value={draft.cardDescription}
              onChange={(event) =>
                handleFieldChange("cardDescription", event.target.value)
              }
              className="w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Card description for customer view"
            />
          </FieldWrapper>

          <FieldWrapper label="Icon">
            <FormSelect
              value={draft.iconKey}
              options={ICON_OPTIONS}
              onChange={(nextValue) => handleFieldChange("iconKey", nextValue)}
            />
          </FieldWrapper>

          <FieldWrapper label="Accent tone">
            <FormSelect
              value={draft.accentTone}
              options={TONE_OPTIONS}
              onChange={(nextValue) =>
                handleFieldChange("accentTone", nextValue)
              }
            />
          </FieldWrapper>

          <FieldWrapper label="Optional Tag">
            <input
              type="text"
              value={draft.optionalTag}
              onChange={(event) =>
                handleFieldChange("optionalTag", event.target.value)
              }
              className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Ex: Required"
            />
          </FieldWrapper>
        </div>
      );
    }

    if (draft.policyType === "faq") {
      return (
        <div className="grid grid-cols-1 gap-3.5">
          <FieldWrapper label="Question" required error={formErrors.question}>
            <input
              type="text"
              value={draft.question}
              onChange={(event) =>
                handleFieldChange("question", event.target.value)
              }
              className={`h-11 w-full rounded-2xl border bg-white px-3.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                formErrors.question ? "border-[#E67C8C]" : "border-[#2D3436]/12"
              }`}
              placeholder="Enter FAQ question"
            />
          </FieldWrapper>

          <FieldWrapper label="Answer" required error={formErrors.answer}>
            <textarea
              rows={4}
              value={draft.answer}
              onChange={(event) =>
                handleFieldChange("answer", event.target.value)
              }
              className={`w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                formErrors.answer ? "border-[#E67C8C]" : "border-[#2D3436]/12"
              }`}
              placeholder="Enter FAQ answer"
            />
          </FieldWrapper>

          <ToggleSwitch
            checked={draft.isMostAsked}
            onChange={() =>
              handleFieldChange("isMostAsked", !draft.isMostAsked)
            }
            label="Mark as Most Asked"
          />
        </div>
      );
    }

    if (draft.policyType === "hero-content") {
      return (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <FieldWrapper label="Eyebrow label">
            <input
              type="text"
              value={draft.eyebrowLabel}
              onChange={(event) =>
                handleFieldChange("eyebrowLabel", event.target.value)
              }
              className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="HappyTails Guide"
            />
          </FieldWrapper>

          <FieldWrapper
            label="Hero title"
            required
            error={formErrors.heroTitle}
          >
            <input
              type="text"
              value={draft.heroTitle}
              onChange={(event) =>
                handleFieldChange("heroTitle", event.target.value)
              }
              className={`h-11 w-full rounded-2xl border bg-white px-3.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                formErrors.heroTitle
                  ? "border-[#E67C8C]"
                  : "border-[#2D3436]/12"
              }`}
              placeholder="Hero main title"
            />
          </FieldWrapper>

          <FieldWrapper
            label="Hero description"
            required
            error={formErrors.heroDescription}
          >
            <textarea
              rows={4}
              value={draft.heroDescription}
              onChange={(event) =>
                handleFieldChange("heroDescription", event.target.value)
              }
              className={`w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                formErrors.heroDescription
                  ? "border-[#E67C8C]"
                  : "border-[#2D3436]/12"
              }`}
              placeholder="Describe policy hero section"
            />
          </FieldWrapper>

          <div className="grid grid-cols-1 gap-3.5">
            <FieldWrapper label="Primary CTA text">
              <input
                type="text"
                value={draft.ctaPrimaryText}
                onChange={(event) =>
                  handleFieldChange("ctaPrimaryText", event.target.value)
                }
                className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                placeholder="View Services"
              />
            </FieldWrapper>

            <FieldWrapper label="Primary CTA link">
              <input
                type="text"
                value={draft.ctaPrimaryLink}
                onChange={(event) =>
                  handleFieldChange("ctaPrimaryLink", event.target.value)
                }
                className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                placeholder="/service"
              />
            </FieldWrapper>

            <FieldWrapper label="Secondary CTA text / link">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={draft.ctaSecondaryText}
                  onChange={(event) =>
                    handleFieldChange("ctaSecondaryText", event.target.value)
                  }
                  className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                  placeholder="Contact Support"
                />
                <input
                  type="text"
                  value={draft.ctaSecondaryLink}
                  onChange={(event) =>
                    handleFieldChange("ctaSecondaryLink", event.target.value)
                  }
                  className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                  placeholder="#support"
                />
              </div>
            </FieldWrapper>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <FieldWrapper
          label="Section title"
          required
          error={formErrors.supportTitle}
        >
          <input
            type="text"
            value={draft.supportTitle}
            onChange={(event) =>
              handleFieldChange("supportTitle", event.target.value)
            }
            className={`h-11 w-full rounded-2xl border bg-white px-3.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
              formErrors.supportTitle
                ? "border-[#E67C8C]"
                : "border-[#2D3436]/12"
            }`}
            placeholder="Need help understanding our policies?"
          />
        </FieldWrapper>

        <FieldWrapper
          label="Description"
          required
          error={formErrors.supportDescription}
        >
          <textarea
            rows={3}
            value={draft.supportDescription}
            onChange={(event) =>
              handleFieldChange("supportDescription", event.target.value)
            }
            className={`w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
              formErrors.supportDescription
                ? "border-[#E67C8C]"
                : "border-[#2D3436]/12"
            }`}
            placeholder="Support section description"
          />
        </FieldWrapper>

        <FieldWrapper label="Button labels">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <input
              type="text"
              value={draft.supportLiveChatLabel}
              onChange={(event) =>
                handleFieldChange("supportLiveChatLabel", event.target.value)
              }
              className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Live Chat"
            />
            <input
              type="text"
              value={draft.supportEmailLabel}
              onChange={(event) =>
                handleFieldChange("supportEmailLabel", event.target.value)
              }
              className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Email"
            />
            <input
              type="text"
              value={draft.supportCallLabel}
              onChange={(event) =>
                handleFieldChange("supportCallLabel", event.target.value)
              }
              className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
              placeholder="Call Us"
            />
          </div>
        </FieldWrapper>
      </div>
    );
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[1400px] space-y-6 pb-10"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-[#D97853]">
            Policy Management
          </h1>
          <p className="text-sm text-[#2D3436]/60">
            Create, organize, publish, and control customer-facing policies.
          </p>
        </div>

        <Motion.button
          type="button"
          onClick={openCreateModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-[22px] bg-[#D97853] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(217,120,83,0.28)] transition-all hover:bg-[#C66A47] md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Policy
        </Motion.button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PolicyStatCard
          icon={FileText}
          title="Total Policies"
          value={stats.total}
          helper="All policies in admin workspace"
          iconClass="bg-[#EEF2FF] border-[#D7DEFF] text-[#3742A7]"
        />
        <PolicyStatCard
          icon={CheckCircle2}
          title="Published"
          value={stats.published}
          helper="Visible on customer-facing pages"
          iconClass="bg-[#F0FAF3] border-[#CDEED8] text-[#2F7D4D]"
        />
        <PolicyStatCard
          icon={Archive}
          title="Draft"
          value={stats.draft}
          helper="Work in progress or unpublished"
          iconClass="bg-[#FFF8E8] border-[#F7DEBC] text-[#AF6C2F]"
        />
        <PolicyStatCard
          icon={MessageCircle}
          title="FAQ Items"
          value={stats.faq}
          helper="Quick answers configured"
          iconClass="bg-[#F3F6FA] border-[#D9E2EC] text-[#486581]"
        />
      </div>

      <AdminFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by title, slug, or keywords..."
        className="rounded-[28px] border-[#E9E2DA] bg-gradient-to-b from-[#FFFEFD] to-[#FBF7F2] p-4 shadow-[0_10px_28px_rgba(45,52,54,0.06)]"
        filters={[
          {
            label: "STATUS",
            icon: CheckCircle2,
            options: ["All Status", "Published", "Draft", "Archived"],
            value:
              statusFilter === "all"
                ? "All Status"
                : getOptionLabel(STATUS_OPTIONS, statusFilter, "Draft"),
            onChange: (option) => {
              if (option === "All Status") return setStatusFilter("all");
              setStatusFilter(option.toLowerCase());
            },
          },
          {
            label: "CATEGORY",
            icon: BookOpen,
            options: [
              "All Categories",
              ...POLICY_CATEGORY_OPTIONS.map((option) => option.label),
            ],
            value:
              categoryFilter === "all"
                ? "All Categories"
                : getOptionLabel(
                    POLICY_CATEGORY_OPTIONS,
                    categoryFilter,
                    "All Categories",
                  ),
            onChange: (option) => {
              if (option === "All Categories") return setCategoryFilter("all");
              const selected = POLICY_CATEGORY_OPTIONS.find(
                (item) => item.label === option,
              );
              setCategoryFilter(selected?.value || "all");
            },
          },
          {
            label: "VISIBILITY",
            icon: Globe,
            options: ["All Visibility", "Public", "Internal", "Hidden"],
            value:
              visibilityFilter === "all"
                ? "All Visibility"
                : getOptionLabel(
                    VISIBILITY_OPTIONS,
                    visibilityFilter,
                    "Public",
                  ),
            onChange: (option) => {
              if (option === "All Visibility")
                return setVisibilityFilter("all");
              setVisibilityFilter(option.toLowerCase());
            },
          },
          {
            label: "TARGET PAGE",
            icon: Home,
            options: [
              "All Targets",
              ...TARGET_SECTION_OPTIONS.map((option) => option.label),
            ],
            value:
              targetFilter === "all"
                ? "All Targets"
                : getOptionLabel(
                    TARGET_SECTION_OPTIONS,
                    targetFilter,
                    "All Targets",
                  ),
            onChange: (option) => {
              if (option === "All Targets") return setTargetFilter("all");
              const selected = TARGET_SECTION_OPTIONS.find(
                (item) => item.label === option,
              );
              setTargetFilter(selected?.value || "all");
            },
          },
          {
            label: "SORT",
            icon: ArrowDown,
            options: ["Updated newest", "Display order", "Alphabetical"],
            value:
              sortBy === "updated-desc"
                ? "Updated newest"
                : sortBy === "display-order"
                  ? "Display order"
                  : "Alphabetical",
            onChange: (option) =>
              setSortBy(
                option === "Display order"
                  ? "display-order"
                  : option === "Alphabetical"
                    ? "alphabetical"
                    : "updated-desc",
              ),
          },
        ]}
      />

      {error ? (
        <div className="rounded-2xl border border-[#F6D5D9] bg-[#FFF5F6] px-4 py-3 text-sm font-medium text-[#B8273F]">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-[#2D3436]/5 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#D97853]" />
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <FileText className="mx-auto mb-4 h-14 w-14 text-[#2D3436]/20" />
            <p className="text-lg font-bold text-[#2D3436]">
              {policies.length === 0
                ? "No policies created yet"
                : "No matching policies"}
            </p>
            <p className="mt-1 text-sm font-medium text-[#2D3436]/55">
              {policies.length === 0
                ? "Create your first policy to start controlling customer-facing policy sections."
                : "Try changing search keywords or filters."}
            </p>
            {policies.length === 0 ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#D97853] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(217,120,83,0.28)] hover:bg-[#C66A47]"
              >
                <Plus className="h-4 w-4" />
                Create first policy
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#2D3436]/5 bg-[#FDFBF7] text-xs font-bold uppercase tracking-[0.08em] text-[#2D3436]">
                    <th className="px-4 py-4">Policy Title</th>
                    <th className="px-3 py-4">Category</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Visibility</th>
                    <th className="px-5 py-4 text-center">Display Order</th>
                    <th className="px-5 py-4">Updated</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3436]/5">
                  {filteredPolicies.map((policy) => {
                    const subtitle = truncateText(
                      policy.shortDescription ||
                        policy.slug ||
                        "No description",
                    );
                    const updatedLabel = policy.updatedAt
                      ? new Date(policy.updatedAt).toLocaleDateString("en-GB")
                      : "-";

                    return (
                      <tr
                        key={policy.id}
                        onClick={() => openDetailModal(policy)}
                        className="cursor-pointer transition-colors hover:bg-[#FDFBF9]"
                      >
                        <td className="px-4 py-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#1F2933]">
                              {policy.title}
                            </p>
                            <p className="truncate text-xs font-medium text-[#2D3436]/55">
                              {subtitle}
                            </p>
                            <p className="mt-1 text-[11px] font-semibold text-[#7B8794]">
                              Updated: {updatedLabel}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <CategoryBadge category={policy.category} />
                        </td>
                        <td className="px-5 py-4">
                          <TypeBadge type={policy.policyType} />
                        </td>
                        <td className="px-5 py-4">
                          <VisibilityBadge visibility={policy.visibility} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1">
                            <button
                              type="button"
                              onClick={(event) =>
                                handleRowAction(event, () =>
                                  handleMoveOrder(policy, "up"),
                                )
                              }
                              className="rounded-md p-1 text-[#52606D] hover:bg-white"
                              title="Move up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[24px] text-center text-xs font-bold text-[#1F2933]">
                              {policy.displayOrder}
                            </span>
                            <button
                              type="button"
                              onClick={(event) =>
                                handleRowAction(event, () =>
                                  handleMoveOrder(policy, "down"),
                                )
                              }
                              className="rounded-md p-1 text-[#52606D] hover:bg-white"
                              title="Move down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-[#52606D]">
                          {policy.updatedAt
                            ? new Date(policy.updatedAt).toLocaleDateString(
                                "en-GB",
                              )
                            : "-"}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={policy.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(event) =>
                                handleRowAction(event, () =>
                                  openEditModal(policy),
                                )
                              }
                              className="rounded-lg border border-[#F0BFAC] bg-[#FFF4ED] p-2 text-[#B45F40] hover:bg-[#FFEDE3]"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {policy.status === "published" ? (
                              <button
                                type="button"
                                onClick={(event) =>
                                  handleRowAction(event, () =>
                                    openPublishModal(policy, "unpublish"),
                                  )
                                }
                                className="rounded-lg border border-[#D9E2EC] bg-[#F1F5F9] p-2 text-[#475569] hover:bg-[#E2E8F0]"
                                title="Unpublish"
                              >
                                <CircleOff className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) =>
                                  handleRowAction(event, () =>
                                    openPublishModal(policy, "publish"),
                                  )
                                }
                                className="rounded-lg border border-[#CDEED8] bg-[#F0FAF3] p-2 text-[#2F7D4D] hover:bg-[#E6F7ED]"
                                title="Publish"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(event) =>
                                handleRowAction(event, () =>
                                  openDeleteModal(policy),
                                )
                              }
                              className="rounded-lg border border-[#F6D5D9] bg-[#FFF5F6] p-2 text-[#B8273F] hover:bg-[#FEECEF]"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {filteredPolicies.map((policy) => (
                <div
                  key={policy.id}
                  onClick={() => openDetailModal(policy)}
                  className="cursor-pointer rounded-2xl border border-[#E2E8F0] bg-[#FFFEFD] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#1F2933]">
                        {policy.title}
                      </p>
                      <p className="mt-1 text-xs text-[#52606D]">
                        {truncateText(
                          policy.shortDescription ||
                            policy.slug ||
                            "No description",
                        )}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#7B8794]">
                        Updated:{" "}
                        {policy.updatedAt
                          ? new Date(policy.updatedAt).toLocaleDateString(
                              "en-GB",
                            )
                          : "-"}
                      </p>
                    </div>
                    <StatusBadge status={policy.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CategoryBadge category={policy.category} />
                    <TypeBadge type={policy.policyType} />
                    <VisibilityBadge visibility={policy.visibility} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#486581]">
                    <span>
                      {getOptionLabel(
                        TARGET_SECTION_OPTIONS,
                        policy.targetSection,
                        "-",
                      )}
                    </span>
                    <span>Order #{policy.displayOrder}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) =>
                        handleRowAction(event, () => openEditModal(policy))
                      }
                      className="flex-1 rounded-xl border border-[#F0BFAC] bg-[#FFF4ED] py-2 text-sm font-semibold text-[#B45F40]"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showFormModal ? (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#121315]/55 p-4 backdrop-blur-[2px]"
            onClick={closeFormModal}
          >
            <Motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-[1100px] overflow-hidden rounded-[28px] border border-[#EFDCD2] bg-[#FFFEFD] shadow-[0_24px_70px_rgba(17,24,39,0.32)]"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={handleSubmitForm}
                className="flex max-h-[92vh] flex-col"
              >
                <div className="sticky top-0 z-30 border-b border-[#EFDCD2] bg-gradient-to-r from-[#FFF1E8] via-[#FFF7F1] to-[#FFFCFA] px-5 py-4 md:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F4D6C7] bg-white/90 shadow-sm">
                        <FileText className="h-5 w-5 text-[#D97853]" />
                      </div>
                      <div>
                        <h2 className="text-[27px] font-extrabold leading-[1.08] tracking-[-0.01em] text-[#1F2933]">
                          {formMode === "edit"
                            ? "Edit Policy"
                            : "Add New Policy"}
                        </h2>
                        <p className="mt-1 text-[13px] font-medium text-[#9D725F]">
                          Create and manage customer-facing policy content.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeFormModal}
                      className="rounded-xl p-2 text-[#7C6A6F] transition-colors hover:bg-white/90 hover:text-[#2D3436]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5 overflow-y-auto px-5 py-4 md:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <section className="space-y-3.5 rounded-2xl border border-[#2D3436]/10 bg-white p-4 md:p-5">
                    <SectionTitle title="BASIC INFORMATION" />
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                      <FieldWrapper
                        label="Policy Title"
                        required
                        error={formErrors.title}
                      >
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(event) =>
                            handleFieldChange("title", event.target.value)
                          }
                          className={`h-11 w-full rounded-2xl border bg-white px-3.5 text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                            formErrors.title
                              ? "border-[#E67C8C]"
                              : "border-[#2D3436]/12"
                          }`}
                          placeholder="Policy title"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Slug" error={formErrors.slug}>
                        <input
                          type="text"
                          value={draft.slug}
                          onChange={(event) =>
                            handleFieldChange(
                              "slug",
                              slugify(event.target.value),
                            )
                          }
                          className={`h-11 w-full rounded-2xl border bg-[#FBFDFF] px-3.5 text-sm font-medium text-[#52606D] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                            formErrors.slug
                              ? "border-[#E67C8C]"
                              : "border-[#2D3436]/12"
                          }`}
                          placeholder="policy-title"
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Category"
                        required
                        error={formErrors.category}
                      >
                        <FormSelect
                          value={draft.category}
                          options={POLICY_CATEGORY_OPTIONS}
                          onChange={(nextValue) =>
                            handleFieldChange("category", nextValue)
                          }
                          hasError={Boolean(formErrors.category)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Policy Type"
                        required
                        error={formErrors.policyType}
                      >
                        <FormSelect
                          value={draft.policyType}
                          options={POLICY_TYPE_OPTIONS}
                          onChange={(nextValue) =>
                            handleFieldChange("policyType", nextValue)
                          }
                          hasError={Boolean(formErrors.policyType)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Short Description">
                        <textarea
                          rows={2}
                          value={draft.shortDescription}
                          onChange={(event) =>
                            handleFieldChange(
                              "shortDescription",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                          placeholder="Short subtitle used in list rows"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Internal Notes">
                        <textarea
                          rows={2}
                          value={draft.internalNotes}
                          onChange={(event) =>
                            handleFieldChange(
                              "internalNotes",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 py-2.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                          placeholder="Optional admin notes"
                        />
                      </FieldWrapper>
                    </div>
                  </section>

                  <section className="space-y-3.5 rounded-2xl border border-[#2D3436]/10 bg-white p-4 md:p-5">
                    <SectionTitle title="CONTENT" />
                    {renderTypeSpecificFields()}
                  </section>

                  <section className="space-y-3.5 rounded-2xl border border-[#2D3436]/10 bg-white p-4 md:p-5">
                    <SectionTitle title="CUSTOMER DISPLAY SETTINGS" />
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                      <FieldWrapper
                        label="Target section"
                        required
                        error={formErrors.targetSection}
                      >
                        <FormSelect
                          value={draft.targetSection}
                          options={TARGET_SECTION_OPTIONS}
                          onChange={(nextValue) =>
                            handleFieldChange("targetSection", nextValue)
                          }
                          hasError={Boolean(formErrors.targetSection)}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Display order"
                        required
                        error={formErrors.displayOrder}
                      >
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={draft.displayOrder}
                          onChange={(event) =>
                            handleFieldChange(
                              "displayOrder",
                              event.target.value,
                            )
                          }
                          className={`h-11 w-full rounded-2xl border bg-white px-3.5 text-sm font-medium text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20 ${
                            formErrors.displayOrder
                              ? "border-[#E67C8C]"
                              : "border-[#2D3436]/12"
                          }`}
                        />
                        <p className="mt-1 text-xs text-[#60758A]">
                          Smaller number appears first. Example: 1 on top, 2
                          below.
                        </p>
                      </FieldWrapper>

                      <FieldWrapper label="Badge text">
                        <input
                          type="text"
                          value={draft.badgeText}
                          onChange={(event) =>
                            handleFieldChange("badgeText", event.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                          placeholder="Ex: Required"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Theme color">
                        <FormSelect
                          value={draft.themeColor}
                          options={TONE_OPTIONS}
                          onChange={(nextValue) =>
                            handleFieldChange("themeColor", nextValue)
                          }
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Visibility"
                        error={formErrors.visibility}
                      >
                        <FormSelect
                          value={draft.visibility}
                          options={VISIBILITY_OPTIONS}
                          onChange={(nextValue) =>
                            handleFieldChange("visibility", nextValue)
                          }
                          hasError={Boolean(formErrors.visibility)}
                        />
                      </FieldWrapper>

                      <ToggleSwitch
                        checked={draft.isFeatured}
                        onChange={() =>
                          handleFieldChange("isFeatured", !draft.isFeatured)
                        }
                        label="Featured policy"
                      />
                      <ToggleSwitch
                        checked={draft.showBadge}
                        onChange={() =>
                          handleFieldChange("showBadge", !draft.showBadge)
                        }
                        label="Show badge"
                      />
                      <ToggleSwitch
                        checked={draft.isPublic}
                        onChange={() =>
                          handleFieldChange("isPublic", !draft.isPublic)
                        }
                        label="Public visibility toggle"
                      />
                    </div>
                  </section>

                  <section className="space-y-3.5 rounded-2xl border border-[#2D3436]/10 bg-white p-4 md:p-5">
                    <SectionTitle title="PUBLISHING" />
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                      <FieldWrapper
                        label="Status"
                        required
                        error={formErrors.status}
                      >
                        <FormSelect
                          value={draft.status}
                          options={STATUS_OPTIONS}
                          onChange={(nextValue) =>
                            handleFieldChange("status", nextValue)
                          }
                          hasError={Boolean(formErrors.status)}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Effective from date">
                        <div className="relative">
                          <DatePicker
                            selected={toPickerDate(draft.effectiveDate)}
                            onChange={(date) =>
                              handleFieldChange(
                                "effectiveDate",
                                date ? toDateInput(date) : "",
                              )
                            }
                            locale={enGB}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Select effective date"
                            className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white py-2.5 pl-10 pr-3.5 text-sm font-medium text-[#2D3436] placeholder:text-[#2D3436]/40 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                            wrapperClassName="w-full"
                            popperClassName="policy-datepicker-popper"
                            calendarClassName="policy-datepicker-calendar"
                            showPopperArrow={false}
                          />
                          <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#60758A]" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Last reviewed date">
                        <div className="relative">
                          <DatePicker
                            selected={toPickerDate(draft.lastReviewedDate)}
                            onChange={(date) =>
                              handleFieldChange(
                                "lastReviewedDate",
                                date ? toDateInput(date) : "",
                              )
                            }
                            locale={enGB}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Select review date"
                            className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white py-2.5 pl-10 pr-3.5 text-sm font-medium text-[#2D3436] placeholder:text-[#2D3436]/40 focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                            wrapperClassName="w-full"
                            popperClassName="policy-datepicker-popper"
                            calendarClassName="policy-datepicker-calendar"
                            showPopperArrow={false}
                          />
                          <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#60758A]" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Version label">
                        <input
                          type="text"
                          value={draft.versionLabel}
                          onChange={(event) =>
                            handleFieldChange(
                              "versionLabel",
                              event.target.value,
                            )
                          }
                          className="h-11 w-full rounded-2xl border border-[#2D3436]/12 bg-white px-3.5 text-sm font-medium text-[#2D3436] focus:border-[#D97853] focus:outline-none focus:ring-2 focus:ring-[#D97853]/20"
                          placeholder="v1.0"
                        />
                      </FieldWrapper>

                      <ToggleSwitch
                        checked={draft.requiresAcknowledgement}
                        onChange={() =>
                          handleFieldChange(
                            "requiresAcknowledgement",
                            !draft.requiresAcknowledgement,
                          )
                        }
                        label="Requires customer acknowledgement"
                      />
                    </div>
                  </section>

                  <section className="space-y-3 rounded-2xl border border-[#2D3436]/10 bg-[#FCFDFE] p-4 md:p-5">
                    <SectionTitle title="CUSTOMER PREVIEW" />
                    <PolicyPreview policy={draft} />
                  </section>
                </div>

                <div className="sticky bottom-0 z-30 flex items-center justify-end gap-2.5 border-t border-[#E7E0DB] bg-white px-5 py-3.5 md:px-6">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="h-11 rounded-xl px-5 text-sm font-semibold text-[#5D656B] transition-colors hover:bg-[#F2F5F7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className={`inline-flex h-11 min-w-[166px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all ${
                      submitLoading
                        ? "cursor-not-allowed bg-[#F2C9B8] text-white/90"
                        : "bg-[#D97853] text-white shadow-[0_10px_24px_rgba(217,120,83,0.28)] hover:bg-[#C66A47]"
                    }`}
                  >
                    {submitLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {formMode === "edit" ? "Update Policy" : "Create Policy"}
                  </button>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showViewModal && selectedPolicy ? (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/55 p-4 backdrop-blur-[2px]"
            onClick={() => setShowViewModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-[24px] border border-[#E2E8F0] bg-[#FEFFFD] shadow-[0_22px_60px_-32px_rgba(15,23,42,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-gradient-to-r from-white via-[#FFF7F0] to-white px-5 py-4">
                <div className="relative flex items-start gap-3 pr-10">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-[#FBDDCB] bg-[#FFF1E6] shadow-sm">
                    <Eye className="h-4 w-4 text-[#D97853]" />
                  </div>
                  <div>
                    <h2 className="text-[22px] font-extrabold leading-[1.08] tracking-[-0.01em] text-[#1F2933]">
                      Policy Detail Preview
                    </h2>
                    <p className="mt-0.5 text-[11px] font-medium text-[#486581]">
                      Read-only view with customer-facing simulation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="absolute right-4 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <section className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                    Policy Snapshot
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7B8794]">
                        Title
                      </p>
                      <p className="mt-1 text-base font-bold text-[#1F2933]">
                        {selectedPolicy.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7B8794]">
                        Slug
                      </p>
                      <p className="mt-1 font-mono text-sm text-[#334E68]">
                        {selectedPolicy.slug}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={selectedPolicy.category} />
                      <TypeBadge type={selectedPolicy.policyType} />
                      <VisibilityBadge visibility={selectedPolicy.visibility} />
                      <StatusBadge status={selectedPolicy.status} />
                    </div>
                    <div className="text-sm text-[#52606D]">
                      <p>
                        Target:{" "}
                        <span className="font-semibold text-[#334E68]">
                          {getOptionLabel(
                            TARGET_SECTION_OPTIONS,
                            selectedPolicy.targetSection,
                            "-",
                          )}
                        </span>
                      </p>
                      <p className="mt-1">
                        Display order:{" "}
                        <span className="font-semibold text-[#334E68]">
                          {selectedPolicy.displayOrder}
                        </span>
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                    Customer Preview Mapping
                  </p>
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#52606D]">
                    <p>
                      This policy maps to{" "}
                      <span className="font-semibold text-[#334E68]">
                        {getOptionLabel(
                          TARGET_SECTION_OPTIONS,
                          selectedPolicy.targetSection,
                          "Unknown section",
                        )}
                      </span>{" "}
                      as{" "}
                      <span className="font-semibold text-[#334E68]">
                        {getOptionLabel(
                          POLICY_TYPE_OPTIONS,
                          selectedPolicy.policyType,
                          "Unknown type",
                        )}
                      </span>
                      .
                    </p>
                  </div>
                  <PolicyPreview policy={selectedPolicy} />
                </section>

                <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7B8794]">
                    Metadata
                  </p>
                  <div className="mt-3 space-y-1.5 text-sm text-[#52606D]">
                    <p>
                      Published by:{" "}
                      <span className="font-semibold text-[#334E68]">
                        {selectedPolicy.createdByName || "-"}
                      </span>
                    </p>
                    <p>
                      Last updated:{" "}
                      <span className="font-semibold text-[#334E68]">
                        {selectedPolicy.updatedAt
                          ? new Date(selectedPolicy.updatedAt).toLocaleString(
                              "en-GB",
                            )
                          : "-"}
                      </span>
                    </p>
                    <p>
                      Version:{" "}
                      <span className="font-semibold text-[#334E68]">
                        {selectedPolicy.versionLabel || "v1.0"}
                      </span>
                    </p>
                  </div>
                </section>
              </div>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && selectedPolicy ? (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#121315]/55 p-4 backdrop-blur-[2px]"
            onClick={() => setShowDeleteModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-[560px] overflow-hidden rounded-[26px] border border-[#F3DDE0] bg-[#FFFEFD] shadow-[0_24px_60px_rgba(17,24,39,0.35)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#F3E3E6] bg-gradient-to-r from-white via-[#FFF9F9] to-[#FFF1F3] px-6 py-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F8D4D8] bg-[#FDEDEE] shadow-sm">
                    <Trash2 className="h-[19px] w-[19px] text-[#D73A4F]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[24px] font-extrabold leading-[1.1] tracking-[-0.01em] text-[#1F2933]">
                      Delete Policy?
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#7A6368]">
                      This action permanently removes the selected policy.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-xl p-2 text-[#7C6A6F] transition-colors hover:bg-white/90 hover:text-[#2D3436]"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                <div className="flex gap-3 rounded-2xl border border-[#F6D5D9] bg-[#FFF5F6] p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#F4CCD2] bg-white">
                    <AlertCircle className="h-4 w-4 text-[#CE3047]" />
                  </div>
                  <div className="text-sm leading-relaxed text-[#7A4048]">
                    <p className="font-semibold text-[#B8273F]">
                      This action cannot be undone.
                    </p>
                    <p className="mt-0.5">
                      Deleting this policy may affect customer-facing sections
                      and historical references.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E8ECF0] bg-[#F8FAFC] p-3.5">
                  <p className="text-base font-bold text-[#1F2933]">
                    {selectedPolicy.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CategoryBadge category={selectedPolicy.category} />
                    <StatusBadge status={selectedPolicy.status} />
                    <SoftBadge className="border-[#D9E2EC] bg-[#F1F5F9] text-[#486581]">
                      {getOptionLabel(
                        TARGET_SECTION_OPTIONS,
                        selectedPolicy.targetSection,
                        "-",
                      )}
                    </SoftBadge>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="h-11 rounded-2xl border border-[#D8E0E7] bg-white px-5 text-sm font-semibold text-[#435261] hover:bg-[#F4F7FA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading}
                    className={`flex h-11 min-w-[140px] items-center justify-center gap-1.5 rounded-2xl px-5 text-sm font-semibold transition-all ${
                      deleteLoading
                        ? "cursor-not-allowed bg-[#F3C1C9] text-white/90"
                        : "bg-gradient-to-r from-[#E15065] to-[#C92E46] text-white shadow-[0_10px_24px_rgba(201,46,70,0.35)] hover:brightness-105"
                    }`}
                  >
                    {deleteLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showPublishModal && selectedPolicy ? (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#121315]/55 p-4 backdrop-blur-[2px]"
            onClick={() => setShowPublishModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-[#FFFEFD] shadow-[0_20px_50px_rgba(17,24,39,0.3)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-[#E2E8F0] bg-gradient-to-r from-white via-[#FFF8F0] to-white px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FBDDCB] bg-[#FFF1E6] text-[#D97853]">
                    {publishMode === "publish" ? (
                      <Send className="h-4 w-4" />
                    ) : (
                      <CircleOff className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#1F2933]">
                      {publishMode === "publish"
                        ? "Publish Policy?"
                        : "Unpublish Policy?"}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#60758A]">
                      {publishMode === "publish"
                        ? "This policy will become visible on the customer-facing policy page."
                        : "This policy will be hidden from customer-facing pages."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <p className="text-base font-bold text-[#1F2933]">
                    {selectedPolicy.title}
                  </p>
                  <div className="mt-2 text-sm text-[#52606D]">
                    <p>
                      Target section:{" "}
                      <span className="font-semibold text-[#334E68]">
                        {getOptionLabel(
                          TARGET_SECTION_OPTIONS,
                          selectedPolicy.targetSection,
                          "-",
                        )}
                      </span>
                    </p>
                    <p className="mt-1">
                      Display order:{" "}
                      <span className="font-semibold text-[#334E68]">
                        {selectedPolicy.displayOrder}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="h-10 rounded-xl border border-[#D8E0E7] bg-white px-4 text-sm font-semibold text-[#435261] hover:bg-[#F4F7FA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPublish}
                    disabled={publishLoading}
                    className={`inline-flex h-10 min-w-[132px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all ${
                      publishMode === "publish"
                        ? publishLoading
                          ? "cursor-not-allowed bg-[#BDE6CC] text-white/90"
                          : "bg-[#2F7D4D] text-white shadow-[0_10px_24px_rgba(47,125,77,0.28)] hover:bg-[#276840]"
                        : publishLoading
                          ? "cursor-not-allowed bg-[#E2E8F0] text-[#475569]/80"
                          : "bg-[#F1F5F9] text-[#475569] shadow-[0_8px_20px_rgba(71,85,105,0.18)] hover:bg-[#E2E8F0]"
                    }`}
                  >
                    {publishLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : publishMode === "publish" ? (
                      <Send className="h-4 w-4" />
                    ) : (
                      <CircleOff className="h-4 w-4" />
                    )}
                    {publishMode === "publish" ? "Publish Now" : "Unpublish"}
                  </button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        ) : null}
      </AnimatePresence>
    </Motion.div>
  );
}
