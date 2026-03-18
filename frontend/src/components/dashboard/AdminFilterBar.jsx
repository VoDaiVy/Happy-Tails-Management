/**
 * AdminFilterBar
 * ──────────────────────────────────────────────
 * Shared filtrar bar used by every Admin Management page.
 * Design standard: matches AdminNewsManagement (HappyTails brand).
 *
 * Props
 * ─────
 * searchValue        {string}   Controlled search input value
 * onSearchChange     {fn}       Called with new string on each keystroke
 * searchPlaceholder  {string}   Input placeholder text
 *
 * filters            {Array}    Each item: { label, icon, options, value, onChange }
 *                               'label'   – orange uppercase label above the dropdown
 *                               'icon'    – Lucide component used as left icon in trigger
 *                               'options' – string[]
 *                               'value'   – currently selected string
 *                               'onChange'– fn(string)
 *
 * dateValue          {Date|null}  react-datepicker value (optional)
 * onDateChange       {fn}         Called with new Date (optional)
 * dateLabel          {string}     Label for the date picker (default "DATE")
 *
 * onCreateClick      {fn}         If provided, renders the orange Create button
 * createLabel        {string}     Button text, e.g. "Create Service"
 *
 * extraActions       {ReactNode}  Any extra buttons rendered after the Create button
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, X, Plus, Calendar, Edit2, Trash2 } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/* ── Inline CustomSelect ── */
const normalizeOption = (option) => {
  if (typeof option === "string") {
    return { label: option, value: option, raw: option };
  }

  return {
    label: option?.label ?? String(option?.value ?? ""),
    value: option?.value ?? option?.label,
    raw: option,
  };
};

const CustomSelect = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  optionActions,
}) => {
  const [open, setOpen] = useState(false);
  const selectedOptionLabel =
    options.map(normalizeOption).find((opt) => opt.value === value)?.label || value;

  return (
    <div
      className={`relative flex flex-col flex-1 min-w-[160px] ${open ? "z-[60]" : "z-10"}`}
    >
      {label && (
        <span className="text-[11px] font-bold text-[#D97853] uppercase tracking-widest ml-1 mb-1.5">
          {label}
        </span>
      )}

      <div
        className={`flex items-center justify-between px-4 py-2.5 bg-[#FDFBF7] border
          ${open ? "border-[#D97853] ring-1 ring-[#D97853]/20" : "border-[#2D3436]/10"}
          rounded-full cursor-pointer hover:border-[#D97853] transition-all select-none`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              size={16}
              className={open ? "text-[#D97853]" : "text-[#7FB069]"}
            />
          )}
          <span className="text-sm font-bold text-[#2D3436] truncate max-w-[110px]">
            {selectedOptionLabel}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`text-[#2D3436]/40 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <>
            {/* backdrop to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[calc(100%+6px)] left-0 w-full bg-[#FDFBF7] rounded-[16px]
                shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#2D3436]/5 overflow-hidden z-50 py-1.5"
            >
              {options.map((opt, idx) => {
                const normalized = normalizeOption(opt);
                const isSelected = value === normalized.value;
                const canShowActions =
                  Boolean(optionActions) &&
                  !(optionActions?.hideForValues || []).includes(normalized.value);

                return (
                  <div
                    key={idx}
                    className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors flex items-center justify-between gap-3
                      ${
                        isSelected
                          ? "border-l-[3px] border-[#D97853] bg-[#D97853]/10 text-[#D97853] font-bold"
                          : "text-[#2D3436]/70 hover:bg-[#2D3436]/5 font-medium"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(normalized.value);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{normalized.label}</span>

                    {canShowActions && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {optionActions?.onEdit && (
                          <button
                            type="button"
                            className="w-6 h-6 rounded-md border border-[#7FB069]/30 text-[#7FB069] hover:bg-[#7FB069]/10 transition-colors flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              optionActions.onEdit(normalized);
                              setOpen(false);
                            }}
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {optionActions?.onDelete && (
                          <button
                            type="button"
                            className="w-6 h-6 rounded-md border border-red-300 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              optionActions.onDelete(normalized);
                              setOpen(false);
                            }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Main FilterBar ── */
const AdminFilterBar = ({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  dateValue = null,
  onDateChange,
  dateLabel = "DATE",
  onCreateClick,
  createLabel = "Create",
  extraActions = null,
  className = "",
}) => (
  <div
    className={`flex flex-wrap lg:flex-nowrap gap-3 items-end bg-white p-3 rounded-[24px] shadow-sm border border-[#2D3436]/5 ${className}`}
  >
    {/* ── Search ── */}
    <div className="relative flex-[4] min-w-[180px] flex flex-col">
      <span className="text-[11px] font-bold text-[#D97853] uppercase tracking-widest ml-1 mb-1.5">
        Search
      </span>
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D97853] pointer-events-none"
          size={17}
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-11 pr-9 py-2.5 bg-[#FDFBF7] border border-[#2D3436]/10 rounded-full text-sm
            font-medium focus:outline-none focus:border-[#D97853] focus:ring-1 focus:ring-[#D97853]/50
            transition-all placeholder:text-[#2D3436]/30 text-[#2D3436]"
        />
        <AnimatePresence>
          {searchValue && (
            <motion.button
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => onSearchChange?.("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#D97853]
                text-white flex items-center justify-center hover:bg-[#c66846] transition-colors"
            >
              <X size={11} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* ── Dropdowns ── */}
    {filters.map((f, i) => (
      <CustomSelect
        key={i}
        label={f.label}
        icon={f.icon}
        options={f.options}
        value={f.value}
        onChange={f.onChange}
        optionActions={f.optionActions}
      />
    ))}

    {/* ── Date picker ── */}
    {onDateChange && (
      <div className="flex flex-col flex-1 min-w-[155px]">
        <span className="text-[11px] font-bold text-[#D97853] uppercase tracking-widest ml-1 mb-1.5">
          {dateLabel}
        </span>
        <div className="relative">
          <DatePicker
            selected={dateValue}
            onChange={onDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className="w-full pl-10 pr-3 py-2.5 bg-[#FDFBF7] border border-[#2D3436]/10 rounded-full
              text-sm font-medium text-[#2D3436] focus:outline-none focus:border-[#D97853]
              focus:ring-1 focus:ring-[#D97853]/50 transition-all cursor-pointer
              placeholder:text-[#2D3436]/30"
            wrapperClassName="w-full"
            popperClassName="admin-datepicker-popper"
          />
          <Calendar
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D97853] pointer-events-none"
          />
        </div>
      </div>
    )}

    {/* ── Extra actions ── */}
    {extraActions}

    {/* ── Create button ── */}
    {onCreateClick && (
      <motion.button
        onClick={onCreateClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#D97853] text-white rounded-xl font-bold
          text-sm shadow-[0_5px_15px_rgba(217,120,83,0.3)] hover:bg-[#c66846] transition-all
          shrink-0 whitespace-nowrap"
      >
        <Plus size={16} />
        {createLabel}
      </motion.button>
    )}
  </div>
);

export { AdminFilterBar, CustomSelect };
export default AdminFilterBar;
