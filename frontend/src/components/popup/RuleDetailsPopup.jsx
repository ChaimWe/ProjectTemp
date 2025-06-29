import React from 'react';
import './style/RuleDetailsPopup.css';
import { useThemeContext } from '../../context/ThemeContext';

const RuleDetailsPopup = ({ rule, dataArray, centerNode, onOpenChat, aiSummary, responseStyle }) => {
  if (!rule) {
    return <div style={{ color: 'red', padding: 16 }}>Error: Rule not found. Please try selecting a different rule.</div>;
  }

  const { getColor } = useThemeContext();

  // Find the AI summary for this specific rule
  const ruleIndex = parseInt(rule.id, 10);
  const aiRuleData = aiSummary && aiSummary[ruleIndex];

  console.log('[RuleDetailsPopup] Debug:', {
    ruleId: rule.id,
    ruleIndex,
    aiSummaryLength: aiSummary?.length || 0,
    aiRuleData,
    hasDependencies: aiRuleData?.Dependencies?.length > 0
  });

  return (
    <div className="rule-popup-content" style={{ backgroundColor: getColor('background'), }}>
      <div className="rule-header">
        <h2 style={{ color: getColor('barText') }} >Rule #{parseInt(rule.id, 10) + 1}: {rule.name}</h2>
      </div>

      {/* Chat Assistant Button */}
      <div style={{ margin: '12px 0' }}>
        <button onClick={onOpenChat} style={{ padding: '8px 16px', background: getColor('barBackground'), color: getColor('barText'), border: '1px solid #888', borderRadius: 4, cursor: 'pointer' }}>
          💬 Ask AI about this rule
        </button>
      </div>

      <div className="rule-action">
        <span className={`action-badge ${rule.action ? rule.action.toLowerCase() : ''}`}>
          {rule.action || 'No Action'}
        </span>
        <span className="priority-badge priority-red">
          Priority: {rule.priority}
        </span>
      </div>

      {/* AI Analysis Section */}
      {aiRuleData && (
        <section
          className="info-section"
          style={{
            backgroundColor: getColor('barBackground'),
            marginBottom: '12px'
          }}
        >
          <h3 style={{ color: getColor('barText') }}>📝 AI Analysis</h3>
          <div className="details-container" style={{ marginTop: '4px', color: getColor('barText') }}>
            <p style={{ margin: '4px 0' }}>
              <strong>Type:</strong> {aiRuleData.Type || 'N/A'}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Condition:</strong> {aiRuleData.Condition || 'N/A'}
            </p>
            {aiRuleData.Dependencies && aiRuleData.Dependencies.length > 0 && (
              <p style={{ margin: '4px 0' }}>
                <strong>Dependencies:</strong> {aiRuleData.Dependencies.join(', ')}
              </p>
            )}
          </div>
        </section>
      )}

      {(rule.warnings || []).length > 0 && (
        <section className="info-section warnings-section" style={{ backgroundColor: getColor('barBackground') }}>
          <h3 style={{ color: getColor('barText') }}>⚠️ Rule Warnings</h3>
          <div className="warnings-container">
            <ul>
              {(rule.warnings || []).map((issue, idx) => (
                <li key={idx} className="warning-item">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="info-section" style={{ backgroundColor: getColor('barBackground') }}>
        <h3 style={{ color: getColor('barText') }}>🔗 Dependant on rules</h3>
        <div className="labels-container">
          {(rule.labelState || []).length > 0 ? (
            (rule.labelState || []).map(([logic, label, rules], i) => (
              <div key={i} className="logic-container" style={{ color: getColor('barText'), marginBottom: '5px' }}>
                {logic === '!' && i > 0 && (rule.labelState || [])[i - 1][0] && (
                  <span style={{ color: '#ff9800' }}>{(rule.labelState || [])[i - 1][0]} </span>
                )}
                {logic && <span style={{ color: '#ff9800' }}>{logic} </span>}
                <span>{label}</span> <br />
                <small key={i} className="rule-reference">
                  {(rules || []).length > 0 ?
                    (rules || []).map((rule, i) => (
                      <React.Fragment key={`${rule.id || ''}-${rule.name || ''}-${i}`}>
                        <span onClick={() => centerNode(String(i))}> → Rule #{i+1}: {rule.name}</span>
                        <br />
                      </React.Fragment>
                    )) :
                    <span onClick={() => document.querySelector('.warnings-section').scrollIntoView({ behavior: 'smooth' })}> → ⚠️</span>}
                </small>
                <br />
              </div>
            ))
          ) : (
            <p className="no-data">No label dependencies</p>
          )}
        </div>
      </section>

      <div className="rule-sections">
        <section className="info-section" style={{ backgroundColor: getColor('barBackground') }}>
          <h3 style={{ color: getColor('barText') }}>🏷️ Added Labels</h3>
          <div className="labels-container">
            {(rule.ruleLabels || []).length > 0 ? (
              (rule.ruleLabels || []).map(label => (
                <span key={label} className="label-chip added">{label}</span>
              ))
            ) : (
              <p className="no-data">No labels added by this rule</p>
            )}
          </div>
        </section>

        <section className="info-section" style={{ backgroundColor: getColor('barBackground') }}>
          <h3 style={{ color: getColor('barText') }}>📜 Insert Headers </h3>
          <div className="headers-container">
            {(rule.insertHeaders || []).length > 0 ? (
              (rule.insertHeaders || []).map(header => (
                <span key={header.name} className="header-chip">{header.name}={header.value}</span>
              ))
            ) : (
              <p className="no-data">No headers used in this rule</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RuleDetailsPopup;