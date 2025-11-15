import { useState, useRef, useEffect } from 'react';

export default function EditableCell({
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder = '',
  className = '',
  disabled = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'number') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Only update if value changed
    if (editValue !== value) {
      onChange(editValue);
    } else {
      setEditValue(value || '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value || '');
      setIsEditing(false);
    }
  };

  const handleChange = (e) => {
    if (type === 'checkbox') {
      setEditValue(e.target.checked);
      onChange(e.target.checked);
    } else {
      setEditValue(e.target.value);
    }
  };

  if (disabled) {
    return (
      <div className={`px-2 py-1 ${className}`}>
        {value || ''}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={handleClick}
        className={`px-2 py-1 cursor-pointer hover:bg-gray-100 min-h-[24px] ${className}`}
      >
        {type === 'checkbox' ? (
          <input
            type="checkbox"
            checked={value || false}
            onChange={handleChange}
            className="cursor-pointer"
          />
        ) : (
          <span className="text-sm">{value || placeholder || ''}</span>
        )}
      </div>
    );
  }

  // Editing mode
  if (type === 'select') {
    return (
      <select
        ref={inputRef}
        value={editValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 border border-blue-500 rounded text-sm ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={editValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="cursor-pointer"
      />
    );
  }

  if (type === 'date') {
    return (
      <input
        ref={inputRef}
        type="date"
        value={editValue || ''}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1 border border-blue-500 rounded text-sm ${className}`}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={editValue || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`w-full px-2 py-1 border border-blue-500 rounded text-sm ${className}`}
    />
  );
}

