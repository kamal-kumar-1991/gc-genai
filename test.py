import cloudscraper
import sys

def main():
    try:
        url = sys.stdin.read().strip()  # Read URL from Node.js input
        scraper = cloudscraper.create_scraper()  # Create CloudScraper instance
        response = scraper.get(url)
        
        print(response.text)  # Send plain text (first 1000 characters for demonstration)
    except Exception as e:
        print(f"Error: {str(e)}")  # Send error as plain text

if __name__ == "__main__":
    main()
