from playwright.sync_api import sync_playwright

def run():
    print("Running domain and company discovery UI tests...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Login
        print("Logging in...")
        page.goto('http://localhost:5173/login')
        page.fill('input[name="email"]', 'qa@avagama.ai')
        page.fill('input[name="password"]', 'qa-pass123')
        page.click('button.btn-cta')
        page.wait_for_url('http://localhost:5173/')
        
        # Go to domain use cases
        print("Testing Domain search...")
        page.goto('http://localhost:5173/use-cases/domain')
        page.wait_for_selector('#discDomain')
        page.fill('#uc_domain', 'Finance')
        page.fill('#uc_role', 'CFO')
        page.fill('#uc_obj', 'Reduce costs')
        page.click('#discDomain')
        
        try:
            # Wait for either result or error
            page.wait_for_selector('.uc-warn-banner, .uc-error-state, .uc-row, .uc-rtitle', timeout=180000)
            if page.locator('.uc-error-state').count() > 0:
                print("Domain Error State:", page.locator('.uc-error-state').inner_text())
            elif page.locator('.uc-warn-banner').count() > 0:
                print("Domain Warn Banner:", page.locator('.uc-warn-banner').inner_text())
            else:
                titles = page.locator('.uc-rtitle').all_inner_texts()
                print("Domain Titles:", titles[:3])
        except Exception as e:
            print("Timeout waiting for domain results")
            
        # Go to company use cases
        print("Testing Company search...")
        page.goto('http://localhost:5173/use-cases/company')
        page.wait_for_selector('#discCompany')
        page.fill('#uc_co', 'Avaali Solutions')
        page.click('#discCompany')
        
        try:
            page.wait_for_selector('.uc-warn-banner, .uc-error-state, .uc-row, .uc-rtitle', timeout=180000)
            if page.locator('.uc-error-state').count() > 0:
                print("Company Error State:", page.locator('.uc-error-state').inner_text())
            elif page.locator('.uc-warn-banner').count() > 0:
                print("Company Warn Banner:", page.locator('.uc-warn-banner').inner_text())
            else:
                titles = page.locator('.uc-rtitle').all_inner_texts()
                print("Company Titles:", titles[:3])
        except Exception as e:
            print("Timeout waiting for company results")
            
        browser.close()

if __name__ == '__main__':
    run()
