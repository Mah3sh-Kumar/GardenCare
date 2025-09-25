import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Tabs = ({ children, defaultActiveKey, className = '', ...props }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeKey, setActiveKey] = useState(defaultActiveKey);

  const tabsClasses = `
    ${className}
  `.trim();

  // Filter children to separate tabs and tab panels
  const tabs = [];
  const tabPanels = [];

  React.Children.forEach(children, (child) => {
    if (child.type === Tab) {
      tabs.push(child);
    } else if (child.type === TabPanel) {
      tabPanels.push(child);
    }
  });

  return (
    <div className={tabsClasses} {...props}>
      {/* Tab List */}
      <div
        className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
      >
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.props.id}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeKey === tab.props.id
                    ? `${isDark ? 'border-green-500 text-green-400' : 'border-green-500 text-green-600'}`
                    : `${isDark ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
                }
              `}
              onClick={() => setActiveKey(tab.props.id)}
              aria-current={activeKey === tab.props.id ? 'page' : undefined}
            >
              {tab.props.children}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {tabPanels.map(
          (panel) =>
            activeKey === panel.props.tabId && (
              <div key={panel.props.tabId}>{panel.props.children}</div>
            ),
        )}
      </div>
    </div>
  );
};

const Tab = ({ children, id }) => {
  return <>{children}</>;
};

const TabPanel = ({ children, tabId }) => {
  return <>{children}</>;
};

Tabs.Tab = Tab;
Tabs.TabPanel = TabPanel;

export default Tabs;
