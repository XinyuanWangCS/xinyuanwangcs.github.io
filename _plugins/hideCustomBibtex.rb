module Jekyll
  module HideCustomBibtex
    def hideCustomBibtex(input)
      keywords = @context.registers[:site].config['filtered_bibtex_keywords'] || []
      bibliography = BibTeX.parse(input)
      bibliography.each do |entry|
        next unless entry.respond_to?(:delete)

        keywords.each { |keyword| entry.delete(keyword.to_sym) }
      end
      bibliography.to_s
    end
  end
end

Liquid::Template.register_filter(Jekyll::HideCustomBibtex)
